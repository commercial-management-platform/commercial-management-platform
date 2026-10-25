import { afterEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { validateEnv } from '../src/config/env.validation.js';
import {
  AUTH_SERVICE_PORT,
  type AuthServicePort,
} from '../src/modules/auth/domain/ports/auth-service.port.js';
import { AuthSession } from '../src/modules/auth/domain/entities/auth-session.entity.js';
import { AuthUser } from '../src/modules/auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../src/modules/auth/domain/types/user-role.enum.js';
import { AuthGuard } from '../src/modules/auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../src/modules/auth/infrastructure/guards/roles.guard.js';
import { UnauthorizedError } from '../src/shared/domain/errors/index.js';
import type {
  ActivityLogEntry,
  ActivityLogPort,
} from '../src/shared/application/ports/activity-log.port.js';
import type {
  CatalogEntry,
  CatalogRepository,
  CatalogType,
  FindCatalogEntriesOptions,
} from '../src/modules/catalogs/domain/repositories/catalog.repository.js';
import { Client } from '../src/modules/clients/domain/entities/client.js';
import {
  CLIENT_IMPORT_REPOSITORY,
  type ClientImportRecord,
  type ClientImportRepository,
  type NewClientImport,
} from '../src/modules/clients/domain/ports/client-import.repository.js';
import type {
  ClientImportFile,
  ClientImportStoragePort,
} from '../src/modules/clients/domain/ports/client-import-storage.port.js';
import { CsvClientReader } from '../src/modules/clients/infrastructure/csv/csv-client-reader.js';
import { ClientImportController } from '../src/modules/clients/presentation/client-import.controller.js';
import { GetClientImportTemplateUseCase } from '../src/modules/clients/application/use-cases/get-client-import-template.use-case.js';
import { CLIENT_IMPORT_COLUMNS } from '../src/modules/clients/application/use-cases/get-client-import-template.use-case.js';
import {
  IMPORT_MAX_ROWS,
  ImportClientsUseCase,
} from '../src/modules/clients/application/use-cases/import-clients.use-case.js';

// Import of clients from CSV (HU-22) through the HTTP API: the real CSV reader
// and use cases, with in-memory fakes for the database, S3 and the catalogs.

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const user = (id: string, role: UserRole) =>
  new AuthUser({
    id,
    email: `${id}@cmp.com`,
    name: id,
    role,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const admin = user('usr_admin', UserRole.Admin);
const director = user('usr_director', UserRole.Director);
const advisor = user('usr_advisor', UserRole.Advisor);
const TOKENS: Record<string, string> = {
  [admin.id]: 'token_admin',
  [director.id]: 'token_director',
  [advisor.id]: 'token_advisor',
};

class InMemoryAuthService implements AuthServicePort {
  async signInEmail(): Promise<never> {
    throw new UnauthorizedError('Not implemented in this test');
  }

  async signOut(): Promise<void> {}

  async signUpEmail(): Promise<never> {
    throw new UnauthorizedError('Not implemented in this test');
  }

  async verifySession(
    headersOrToken: Record<string, string | string[] | undefined> | string,
  ) {
    const header =
      typeof headersOrToken === 'string'
        ? `Bearer ${headersOrToken}`
        : headersOrToken.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : undefined;
    const found = [admin, director, advisor].find(
      (u) => TOKENS[u.id] === token,
    );
    if (!found) return null;
    return {
      user: found,
      session: new AuthSession({
        id: `sess_${found.id}`,
        token: token!,
        userId: found.id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
  }
}

/**
 * Catalogs by name. 'Sur' is inactive, so naming it in a row is an error
 * (CA-06). Like the real repository, inactive entries are only returned on demand.
 */
const CATALOGS: Partial<Record<CatalogType, CatalogEntry[]>> = {
  zone: [
    { id: 1, name: 'Norte', active: true },
    { id: 2, name: 'Sur', active: false },
  ],
  clientType: [{ id: 10, name: 'Retail', active: true }],
  clientPotential: [{ id: 20, name: 'Alto', active: true }],
  clientStatus: [{ id: 30, name: 'Activo', active: true }],
};

const catalogs = {
  findAll: async (type: CatalogType, options?: FindCatalogEntriesOptions) =>
    (CATALOGS[type] ?? []).filter((e) => options?.includeInactive || e.active),
} as unknown as CatalogRepository;

/** client and client_import tables. The NIT 900000001-1 already exists (CA-07). */
class InMemoryClientImportRepository implements ClientImportRepository {
  readonly records: ClientImportRecord[] = [];
  readonly clients: Client[] = [];
  private readonly existingNits = new Set(['900000001-1']);

  async findAll(): Promise<ClientImportRecord[]> {
    return [...this.records].reverse();
  }

  async findExistingNits(nits: string[]): Promise<string[]> {
    return nits.filter((nit) => this.existingNits.has(nit));
  }

  async saveImport(data: NewClientImport): Promise<ClientImportRecord> {
    const record = {
      ...data,
      id: this.records.length + 1,
      createdAt: new Date(),
    };
    this.records.push(record);
    return record;
  }

  async importClients(
    clients: Client[],
    data: NewClientImport,
  ): Promise<Client[]> {
    await this.saveImport(data);
    const saved = clients.map(
      (client, index) =>
        new Client({ ...client, id: 100 + this.clients.length + index }),
    );
    this.clients.push(...saved);
    return saved;
  }
}

/** S3 fake: keeps the uploaded files (only the key reaches the database, CA-10). */
class InMemoryImportStorage implements ClientImportStoragePort {
  readonly files: ClientImportFile[] = [];

  async save(file: ClientImportFile): Promise<{ fileKey: string }> {
    this.files.push(file);
    return { fileKey: `client-imports/${this.files.length}.csv` };
  }
}

class RecordedActivities implements ActivityLogPort {
  readonly entries: ActivityLogEntry[] = [];

  async record(entry: ActivityLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}

interface TestContext {
  app: INestApplication<App>;
  imports: InMemoryClientImportRepository;
  storage: InMemoryImportStorage;
  activities: RecordedActivities;
}

async function createTestApp(): Promise<TestContext> {
  const imports = new InMemoryClientImportRepository();
  const storage = new InMemoryImportStorage();
  const activities = new RecordedActivities();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        validate: validateEnv,
      }),
    ],
    controllers: [ClientImportController],
    providers: [
      { provide: AUTH_SERVICE_PORT, useValue: new InMemoryAuthService() },
      { provide: CLIENT_IMPORT_REPOSITORY, useValue: imports },
      {
        provide: GetClientImportTemplateUseCase,
        useFactory: () => new GetClientImportTemplateUseCase(catalogs),
      },
      {
        provide: ImportClientsUseCase,
        useFactory: () =>
          new ImportClientsUseCase(
            new CsvClientReader(),
            imports,
            storage,
            catalogs,
            activities,
          ),
      },
      AuthGuard,
      RolesGuard,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return { app, imports, storage, activities };
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

type Row = Partial<Record<(typeof CLIENT_IMPORT_COLUMNS)[number], string>>;

const validRow = (overrides: Row = {}): Row => ({
  nit: '901111111-1',
  business_name: 'Ferretería del Norte S.A.S',
  trade_name: 'Ferre Norte',
  address: 'Calle 84 #51B-15',
  department: 'Atlántico',
  municipality: 'Barranquilla',
  neighborhood: 'Alto Prado',
  phone: '6053982210',
  email: 'compras@ferrenorte.co',
  latitude: '11.0038',
  longitude: '-74.8113',
  zone: 'Norte',
  client_type: 'Retail',
  client_potential: 'Alto',
  client_status: 'Activo',
  visit_frequency_days: '15',
  ...overrides,
});

/** Builds a CSV like Excel in Spanish saves it: UTF-8 with BOM and ';' by default. */
function csv(rows: Row[], options: { separator?: string; bom?: boolean } = {}) {
  const separator = options.separator ?? ';';
  const lines = [
    CLIENT_IMPORT_COLUMNS.join(separator),
    ...rows.map((row) =>
      CLIENT_IMPORT_COLUMNS.map((c) => row[c] ?? '').join(separator),
    ),
  ];
  return Buffer.from(
    (options.bom === false ? '' : '﻿') + lines.join('\r\n'),
    'utf8',
  );
}

function upload(
  context: TestContext,
  file: Buffer,
  options: { dryRun?: boolean; as?: AuthUser } = {},
) {
  const req = request(context.app.getHttpServer())
    .post('/api/clients/import')
    .query(options.dryRun ? { dryRun: 'true' } : {})
    .set('Authorization', `Bearer ${TOKENS[(options.as ?? director).id]}`);
  return req.attach('file', file, {
    filename: 'clientes.csv',
    contentType: 'text/csv',
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Client import from CSV (HU-22) - e2e', () => {
  let context: TestContext;

  afterEach(async () => {
    await context?.app.close();
  });

  describe('GET /api/clients/import/template (CA-01)', () => {
    it('returns the headers and an example row with real catalog names, UTF-8 with BOM', async () => {
      context = await createTestApp();
      const res = await request(context.app.getHttpServer())
        .get('/api/clients/import/template')
        .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () =>
            done(null, Buffer.concat(chunks).toString('utf8')),
          );
        })
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain(
        'plantilla-clientes.csv',
      );
      const text = res.body as string;
      expect(text.startsWith('﻿')).toBe(true);
      const [header, example] = text.slice(1).trim().split(/\r?\n/);
      expect(header.split(';')).toEqual([...CLIENT_IMPORT_COLUMNS]);
      // The example row names the first active entry of each catalog.
      expect(example).toContain('Norte');
      expect(example).toContain('Retail');
    });
  });

  describe('Permissions (CA-02)', () => {
    it('rejects a request without session with 401', async () => {
      context = await createTestApp();
      await request(context.app.getHttpServer())
        .post('/api/clients/import')
        .attach('file', csv([validRow()]), 'clientes.csv')
        .expect(401);
    });

    it('does not let an advisor import or download the template (403)', async () => {
      context = await createTestApp();
      await upload(context, csv([validRow()]), { as: advisor }).expect(403);
      await request(context.app.getHttpServer())
        .get('/api/clients/import/template')
        .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
        .expect(403);
      expect(context.imports.clients).toHaveLength(0);
    });

    it('lets admin and director import', async () => {
      context = await createTestApp();
      await upload(context, csv([validRow()]), {
        as: admin,
        dryRun: true,
      }).expect(200);
      await upload(context, csv([validRow()]), {
        as: director,
        dryRun: true,
      }).expect(200);
    });
  });

  describe('Valid files', () => {
    it('validates without saving anything with dryRun=true (CA-04)', async () => {
      context = await createTestApp();
      const res = await upload(
        context,
        csv([validRow(), validRow({ nit: '902222222-2' })]),
        { dryRun: true },
      ).expect(200);

      expect(res.body).toEqual({
        totalRows: 2,
        importedRows: 0,
        errorRows: 0,
        status: 'validated',
        errors: [],
      });
      expect(context.imports.clients).toHaveLength(0);
      expect(context.imports.records[0]).toMatchObject({
        status: 'validated',
        importedRows: 0,
      });
      expect(context.activities.entries).toHaveLength(0);
    });

    it('imports a file with semicolons and BOM, maps catalog names to ids and logs each client', async () => {
      context = await createTestApp();
      const res = await upload(
        context,
        csv([
          validRow(),
          // Catalog names match without case or surrounding spaces (CA-06).
          validRow({
            nit: '902222222-2',
            zone: ' norte ',
            client_type: 'RETAIL',
            email: '',
            latitude: '',
            longitude: '',
          }),
        ]),
      ).expect(200);

      expect(res.body).toMatchObject({
        totalRows: 2,
        importedRows: 2,
        errorRows: 0,
        status: 'imported',
      });
      expect(context.imports.clients).toHaveLength(2);
      expect(context.imports.clients[1]).toMatchObject({
        nit: '902222222-2',
        zoneId: 1,
        clientTypeId: 10,
        clientPotentialId: 20,
        clientStatusId: 30,
        email: null,
        latitude: null,
        active: true,
      });
      // CA-10: the file goes to storage and only its key to the database.
      expect(context.storage.files).toHaveLength(1);
      expect(context.imports.records[0]).toMatchObject({
        fileKey: 'client-imports/1.csv',
        status: 'imported',
        importedRows: 2,
        userId: director.id,
      });
      // CA-11: one client.imported entry per new client.
      expect(
        context.activities.entries.map((e) => [e.action, e.clientId]),
      ).toEqual([
        ['client.imported', 100],
        ['client.imported', 101],
      ]);
    });

    it('also accepts commas and a file without BOM (CA-03)', async () => {
      context = await createTestApp();
      const res = await upload(
        context,
        csv([validRow()], { separator: ',', bom: false }),
      ).expect(200);
      expect(res.body).toMatchObject({ importedRows: 1, status: 'imported' });
      expect(context.imports.clients[0].businessName).toBe(
        'Ferretería del Norte S.A.S',
      );
    });
  });

  describe('Invalid files', () => {
    it('reports every error by line and column and imports nothing (CA-05 to CA-09)', async () => {
      context = await createTestApp();
      const res = await upload(
        context,
        csv([
          validRow(), // line 2: valid, but nothing is imported because others fail
          validRow({
            nit: '903333333-3',
            business_name: '',
            email: 'no-es-un-email',
          }), // line 3
          validRow({ nit: '901111111-1' }), // line 4: repeats the NIT of line 2
          validRow({ nit: '900000001-1' }), // line 5: NIT already in the database
          validRow({ nit: '904444444-4', zone: 'Oriente', client_status: '' }), // line 6
          validRow({ nit: '905555555-5', zone: 'Sur' }), // line 7: inactive catalog entry
          validRow({
            nit: '906666666-6',
            visit_frequency_days: '0',
            latitude: '100',
          }), // line 8
          validRow({ nit: '12345' }), // line 9: malformed NIT
        ]),
      ).expect(400);

      const errors = (
        res.body as { errors: { rowNumber: number; column: string }[] }
      ).errors;
      const at = (rowNumber: number) =>
        errors
          .filter((e) => e.rowNumber === rowNumber)
          .map((e) => e.column)
          .sort();

      expect(res.body).toMatchObject({
        totalRows: 8,
        importedRows: 0,
        errorRows: 7,
        status: 'failed',
      });
      expect(at(2)).toEqual([]);
      expect(at(3)).toEqual(['business_name', 'email']);
      expect(at(4)).toEqual(['nit']);
      expect(at(5)).toEqual(['nit']);
      expect(at(6)).toEqual(['client_status', 'zone']);
      expect(at(7)).toEqual(['zone']);
      expect(at(8)).toEqual(['latitude', 'visit_frequency_days']);
      expect(at(9)).toEqual(['nit']);

      // CA-08: all or nothing, but the failed attempt is recorded.
      expect(context.imports.clients).toHaveLength(0);
      expect(context.imports.records[0]).toMatchObject({
        status: 'failed',
        errorRows: 7,
      });
      expect(context.activities.entries).toHaveLength(0);
    });

    it('rejects a request without file', async () => {
      context = await createTestApp();
      await request(context.app.getHttpServer())
        .post('/api/clients/import')
        .set('Authorization', `Bearer ${TOKENS[director.id]}`)
        .expect(400);
    });

    it(`rejects a file with more than ${IMPORT_MAX_ROWS} rows (CA-02)`, async () => {
      context = await createTestApp();
      const rows = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) =>
        validRow({ nit: String(910_000_000 + i) }),
      );
      await upload(context, csv(rows), { dryRun: true }).expect(400);
      expect(context.imports.records).toHaveLength(0);
    });

    it('rejects a file larger than 2 MB with 413 (CA-02)', async () => {
      context = await createTestApp();
      const big = Buffer.alloc(2 * 1024 * 1024 + 1, 'a');
      await upload(context, big, { dryRun: true }).expect(413);
    });
  });

  describe('GET /api/clients/imports', () => {
    it('lists the imports newest first', async () => {
      context = await createTestApp();
      await upload(context, csv([validRow()]), { dryRun: true }).expect(200);
      await upload(context, csv([validRow()])).expect(200);

      const res = await request(context.app.getHttpServer())
        .get('/api/clients/imports')
        .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
        .expect(200);
      expect((res.body as { status: string }[]).map((r) => r.status)).toEqual([
        'imported',
        'validated',
      ]);
    });
  });
});
