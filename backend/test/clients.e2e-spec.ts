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
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../src/shared/domain/errors/index.js';
import { ClientsController } from '../src/modules/clients/presentation/clients.controller.js';
import { CreateClientUseCase } from '../src/modules/clients/application/use-cases/create-client.use-case.js';
import { ListClientsUseCase } from '../src/modules/clients/application/use-cases/list-clients.use-case.js';
import { GetClientByIdUseCase } from '../src/modules/clients/application/use-cases/get-client-by-id.use-case.js';
import { UpdateClientUseCase } from '../src/modules/clients/application/use-cases/update-client.use-case.js';
import { ChangeClientStatusUseCase } from '../src/modules/clients/application/use-cases/change-client-status.use-case.js';
import {
  CLIENT_REPOSITORY,
  type ClientFilterOptions,
  type ClientRepository,
  type UpdateClientData,
} from '../src/modules/clients/domain/repositories/client.repository.js';
import {
  CATALOG_VALIDATOR,
  type CatalogName,
  type CatalogValidatorPort,
} from '../src/modules/clients/application/ports/catalog-validator.port.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../src/modules/clients/application/ports/advisor-client-access.port.js';
import {
  ACTIVITY_LOG,
  type ActivityLogEntry,
  type ActivityLogPort,
} from '../src/modules/clients/application/ports/activity-log.port.js';
import {
  Client,
  type ClientProps,
} from '../src/modules/clients/domain/entities/client.js';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const adminUser = new AuthUser({
  id: 'usr_admin_1',
  email: 'admin@cmp.com',
  name: 'Admin User',
  role: UserRole.Admin,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const directorUser = new AuthUser({
  id: 'usr_director_1',
  email: 'director@cmp.com',
  name: 'Director User',
  role: UserRole.Director,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const advisorUser = new AuthUser({
  id: 'usr_advisor_1',
  email: 'advisor@cmp.com',
  name: 'Advisor User',
  role: UserRole.Advisor,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const TOKEN_BY_USER: Record<string, string> = {
  [adminUser.id]: 'token_admin',
  [directorUser.id]: 'token_director',
  [advisorUser.id]: 'token_advisor',
};

/** Auth service fake: each user has one session token. */
class InMemoryAuthService implements AuthServicePort {
  private readonly sessions = new Map<
    string,
    { user: AuthUser; session: AuthSession }
  >();

  constructor(users: AuthUser[]) {
    for (const user of users) {
      const token = TOKEN_BY_USER[user.id];
      const session = new AuthSession({
        id: `sess_${user.id}`,
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.sessions.set(token, { user, session });
    }
  }

  async signInEmail(): Promise<never> {
    throw new UnauthorizedError('Not implemented in this test');
  }

  async signOut(): Promise<void> {
    // Sessions are never removed in these tests.
  }

  async signUpEmail(): Promise<never> {
    throw new UnauthorizedError('Not implemented in this test');
  }

  async verifySession(
    headersOrToken: Record<string, string | string[] | undefined> | string,
  ) {
    let token: string | undefined;

    if (typeof headersOrToken === 'string') {
      token = headersOrToken;
    } else {
      const authHeader = headersOrToken.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) return null;
    return this.sessions.get(token) ?? null;
  }
}

/** Repository fake that reproduces the PostgreSQL unique constraint on nit. */
class InMemoryClientRepository implements ClientRepository {
  private readonly rows = new Map<number, Client>();
  private nextId = 1;

  seed(props: ClientProps): Client {
    const id = this.nextId++;
    const client = new Client({ ...props, id });
    this.rows.set(id, client);
    return client;
  }

  async findAll(options?: ClientFilterOptions): Promise<Client[]> {
    let result = [...this.rows.values()];

    const ids = options?.ids;
    if (ids !== undefined) {
      result = result.filter(
        (client) => client.id !== null && ids.includes(client.id),
      );
    }
    const active = options?.active;
    if (active !== undefined) {
      result = result.filter((client) => client.active === active);
    }
    const zoneId = options?.zoneId;
    if (zoneId !== undefined) {
      result = result.filter((client) => client.zoneId === zoneId);
    }
    const clientTypeId = options?.clientTypeId;
    if (clientTypeId !== undefined) {
      result = result.filter((client) => client.clientTypeId === clientTypeId);
    }
    const clientPotentialId = options?.clientPotentialId;
    if (clientPotentialId !== undefined) {
      result = result.filter(
        (client) => client.clientPotentialId === clientPotentialId,
      );
    }
    const clientStatusId = options?.clientStatusId;
    if (clientStatusId !== undefined) {
      result = result.filter(
        (client) => client.clientStatusId === clientStatusId,
      );
    }
    const search = options?.search?.trim().toLowerCase();
    if (search) {
      result = result.filter(
        (client) =>
          client.nit.toLowerCase().includes(search) ||
          client.businessName.toLowerCase().includes(search),
      );
    }

    return result.sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
  }

  async findById(id: number): Promise<Client | null> {
    return this.rows.get(id) ?? null;
  }

  async findByNit(nit: string): Promise<Client | null> {
    for (const client of this.rows.values()) {
      if (client.nit === nit) return client;
    }
    return null;
  }

  async save(client: Client): Promise<Client> {
    // Simulates the PostgreSQL 23505 unique violation translated to 409.
    if (await this.findByNit(client.nit)) {
      throw new ConflictError('A client with the same NIT already exists');
    }
    const id = this.nextId++;
    const saved = new Client({
      ...client,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.rows.set(id, saved);
    return saved;
  }

  async update(id: number, data: UpdateClientData): Promise<Client> {
    const existing = this.rows.get(id);
    if (!existing) {
      throw new NotFoundError(`Client with id '${id}' not found`);
    }
    const merged = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    } as ClientProps;
    const updated = new Client(merged);
    this.rows.set(id, updated);
    return updated;
  }
}

/**
 * Advisor visibility fake: the advisor user can only reach the clients of
 * their routes, mirroring route_client (HU-07).
 */
class InMemoryAdvisorAccess implements AdvisorClientAccessPort {
  private readonly routes = new Map<string, number[]>();

  assign(userId: string, clientIds: number[]): void {
    this.routes.set(userId, clientIds);
  }

  async canAccess(userId: string, clientId: number): Promise<boolean> {
    return (this.routes.get(userId) ?? []).includes(clientId);
  }

  async getAccessibleClientIds(userId: string): Promise<number[]> {
    return this.routes.get(userId) ?? [];
  }
}

/** Records every entry written by the client use cases. */
class InMemoryActivityLog implements ActivityLogPort {
  readonly entries: ActivityLogEntry[] = [];

  async record(entry: ActivityLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}

/** Catalog fake: only ids 1 and 2 exist (as HU-05 seeds will do). */
const catalogValidator: CatalogValidatorPort = {
  exists: async (catalog: CatalogName, id: number): Promise<boolean> =>
    id === 1 || id === 2,
};

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

interface TestContext {
  app: INestApplication<App>;
  repository: InMemoryClientRepository;
  access: InMemoryAdvisorAccess;
  activityLog: InMemoryActivityLog;
}

function emptyClientProps(
  overrides: Partial<ClientProps> & Pick<ClientProps, 'nit' | 'businessName'>,
): ClientProps {
  return {
    id: null,
    tradeName: null,
    address: null,
    department: null,
    municipality: null,
    neighborhood: null,
    phone: null,
    email: null,
    zoneId: null,
    clientTypeId: null,
    clientPotentialId: null,
    clientStatusId: null,
    visitFrequencyDays: null,
    latitude: null,
    longitude: null,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

async function createTestApp(): Promise<TestContext> {
  const repository = new InMemoryClientRepository();
  const access = new InMemoryAdvisorAccess();
  const activityLog = new InMemoryActivityLog();

  const routedClient = repository.seed(
    emptyClientProps({
      nit: '900123456-5',
      businessName: 'Distribuidora Andina SAS',
      tradeName: 'Andina',
      zoneId: 1,
      phone: '6015551234',
    }),
  );
  repository.seed(
    emptyClientProps({
      nit: '800123456-7',
      businessName: 'Comercializadora Norte Ltda',
      zoneId: 2,
      active: false,
    }),
  );

  // The advisor only has the first client on their routes.
  access.assign(advisorUser.id, [routedClient.id!]);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        validate: validateEnv,
      }),
    ],
    controllers: [ClientsController],
    providers: [
      {
        provide: AUTH_SERVICE_PORT,
        useValue: new InMemoryAuthService([
          adminUser,
          directorUser,
          advisorUser,
        ]),
      },
      { provide: CLIENT_REPOSITORY, useValue: repository },
      { provide: CATALOG_VALIDATOR, useValue: catalogValidator },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: access },
      { provide: ACTIVITY_LOG, useValue: activityLog },
      {
        provide: CreateClientUseCase,
        inject: [CLIENT_REPOSITORY, CATALOG_VALIDATOR, ACTIVITY_LOG],
        useFactory: (
          r: ClientRepository,
          c: CatalogValidatorPort,
          l: ActivityLogPort,
        ) => new CreateClientUseCase(r, c, l),
      },
      {
        provide: ListClientsUseCase,
        inject: [CLIENT_REPOSITORY, ADVISOR_CLIENT_ACCESS],
        useFactory: (r: ClientRepository, a: AdvisorClientAccessPort) =>
          new ListClientsUseCase(r, a),
      },
      {
        provide: GetClientByIdUseCase,
        inject: [CLIENT_REPOSITORY, ADVISOR_CLIENT_ACCESS],
        useFactory: (r: ClientRepository, a: AdvisorClientAccessPort) =>
          new GetClientByIdUseCase(r, a),
      },
      {
        provide: UpdateClientUseCase,
        inject: [
          CLIENT_REPOSITORY,
          CATALOG_VALIDATOR,
          ADVISOR_CLIENT_ACCESS,
          ACTIVITY_LOG,
        ],
        useFactory: (
          r: ClientRepository,
          c: CatalogValidatorPort,
          a: AdvisorClientAccessPort,
          l: ActivityLogPort,
        ) => new UpdateClientUseCase(r, c, a, l),
      },
      {
        provide: ChangeClientStatusUseCase,
        inject: [CLIENT_REPOSITORY, ACTIVITY_LOG],
        useFactory: (r: ClientRepository, l: ActivityLogPort) =>
          new ChangeClientStatusUseCase(r, l),
      },
      AuthGuard,
      RolesGuard,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return { app, repository, access, activityLog };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Client management (HU-03) - e2e', () => {
  let context: TestContext;

  afterEach(async () => {
    if (context?.app) {
      await context.app.close();
    }
  });

  describe('POST /api/clients', () => {
    it('creates a valid client and registers the activity log', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', 'Bearer token_admin')
        .send({
          nit: '700123456-3',
          businessName: 'Distribuidora Sur SAS',
          tradeName: 'Sur',
          email: 'ventas@distribuidorasur.co',
          zoneId: 1,
          visitFrequencyDays: 14,
          latitude: 4.711,
          longitude: -74.0721,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        nit: '700123456-3',
        businessName: 'Distribuidora Sur SAS',
        zoneId: 1,
        latitude: 4.711,
        longitude: -74.0721,
        active: true,
      });
      expect(typeof response.body.id).toBe('number');

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'client.created',
      );
      expect(entry).toBeDefined();
      expect(entry?.userId).toBe(adminUser.id);
    });

    it('allows the director to create clients', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', 'Bearer token_director')
        .send({ nit: '600123456-4', businessName: 'Comercial El Kid SAS' })
        .expect(201);
    });

    it('rejects a client without businessName with 400', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', 'Bearer token_admin')
        .send({ nit: '700123456-3' })
        .expect(400);

      expect(response.body).toMatchObject({ statusCode: 400 });
    });

    it('rejects an invalid NIT format with 400', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', 'Bearer token_admin')
        .send({ nit: 'NOT-A-NIT', businessName: 'Distribuidora Sur SAS' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([
          expect.stringContaining('valid Colombian NIT'),
        ]),
      });
    });

    it('rejects a repeated NIT with 409 Conflict', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', 'Bearer token_admin')
        .send({ nit: '900123456-5', businessName: 'Otra Razón Social' })
        .expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        error: 'Conflict',
        message: 'A client with the same NIT already exists',
      });
    });

    it('rejects a catalog id that does not exist with 400', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', 'Bearer token_admin')
        .send({
          nit: '700123456-3',
          businessName: 'Distribuidora Sur SAS',
          zoneId: 999,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: "Unknown zone id '999'",
      });
    });

    it('rejects an advisor with 403 Forbidden', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients')
        .set('Authorization', 'Bearer token_advisor')
        .send({ nit: '700123456-3', businessName: 'Distribuidora Sur SAS' })
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message: expect.stringContaining("role 'advisor'"),
      });
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients')
        .send({ nit: '700123456-3', businessName: 'Distribuidora Sur SAS' })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });
  });

  describe('GET /api/clients', () => {
    it('lists every client for an admin', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/clients')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((c: { nit: string }) => c.nit)).toEqual(
        expect.arrayContaining(['900123456-5', '800123456-7']),
      );
    });

    it('filters by search text and active state', async () => {
      context = await createTestApp();

      const bySearch = await request(context.app.getHttpServer())
        .get('/api/clients')
        .query({ search: 'norte' })
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(bySearch.body).toHaveLength(1);
      expect(bySearch.body[0].businessName).toBe('Comercializadora Norte Ltda');

      const activeOnly = await request(context.app.getHttpServer())
        .get('/api/clients')
        .query({ active: 'true' })
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(activeOnly.body).toHaveLength(1);
      expect(activeOnly.body[0].nit).toBe('900123456-5');
    });

    it('only lists the routed clients of an advisor', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/clients')
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].nit).toBe('900123456-5');
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/clients')
        .expect(401);
    });
  });

  describe('GET /api/clients/:id', () => {
    it('returns an existing client', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/clients/1')
        .set('Authorization', 'Bearer token_director')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        nit: '900123456-5',
        businessName: 'Distribuidora Andina SAS',
        zoneId: 1,
        active: true,
      });
    });

    it('answers 404 for a client that does not exist', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/clients/999')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });

    it('answers 400 for a non-numeric id', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/clients/abc')
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });

    it('answers 404 to an advisor for a client outside their routes', async () => {
      context = await createTestApp();

      // Client 2 exists but is not on the advisor's routes.
      await request(context.app.getHttpServer())
        .get('/api/clients/2')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      await request(context.app.getHttpServer())
        .get('/api/clients/2')
        .set('Authorization', 'Bearer token_advisor')
        .expect(404);
    });

    it('lets an advisor read a client on their routes', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/clients/1')
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);
    });
  });

  describe('PATCH /api/clients/:id', () => {
    it('updates the allowed fields and registers the activity log', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch('/api/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .send({
          phone: '6019998888',
          municipality: 'Bogota',
          latitude: 4.7,
          longitude: -74.08,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        phone: '6019998888',
        municipality: 'Bogota',
        latitude: 4.7,
        longitude: -74.08,
        nit: '900123456-5',
      });

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'client.updated',
      );
      expect(entry).toBeDefined();
      expect(entry?.clientId).toBe(1);
    });

    it('clears a nullable field when null is sent', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch('/api/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .send({ tradeName: null })
        .expect(200);

      expect(response.body.tradeName).toBeNull();
      expect(response.body.nit).toBe('900123456-5');
    });

    it('rejects a NIT already used by another client with 409', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch('/api/clients/2')
        .set('Authorization', 'Bearer token_admin')
        .send({ nit: '900123456-5' })
        .expect(409);

      expect(response.body).toMatchObject({ statusCode: 409 });
    });

    it('rejects an invalid catalog id with 400', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch('/api/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .send({ clientTypeId: 777 })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: "Unknown client_type id '777'",
      });
    });

    it('answers 404 when the client does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/clients/999')
        .set('Authorization', 'Bearer token_admin')
        .send({ phone: '6010000000' })
        .expect(404);
    });

    it('rejects an advisor updating a client outside their routes with 404', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/clients/2')
        .set('Authorization', 'Bearer token_advisor')
        .send({ phone: '6010000000' })
        .expect(404);
    });

    it('lets an advisor update a client on their routes', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch('/api/clients/1')
        .set('Authorization', 'Bearer token_advisor')
        .send({ phone: '6017777777' })
        .expect(200);

      expect(response.body.phone).toBe('6017777777');
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/clients/1')
        .send({ phone: '6010000000' })
        .expect(401);
    });
  });

  describe('PATCH /api/clients/:id/status', () => {
    it('deactivates a client preserving all its data and history', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch('/api/clients/1/status')
        .set('Authorization', 'Bearer token_admin')
        .send({ active: false })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        active: false,
        nit: '900123456-5',
        businessName: 'Distribuidora Andina SAS',
        zoneId: 1,
        phone: '6015551234',
      });

      // The client still exists (no physical delete) and keeps its fields.
      const fetched = await request(context.app.getHttpServer())
        .get('/api/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(fetched.body).toMatchObject({
        active: false,
        nit: '900123456-5',
        businessName: 'Distribuidora Andina SAS',
        tradeName: 'Andina',
        zoneId: 1,
      });

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'client.status_changed',
      );
      expect(entry).toBeDefined();
      expect(entry?.description).toContain('deactivated');
    });

    it('reactivates a deactivated client', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch('/api/clients/2/status')
        .set('Authorization', 'Bearer token_director')
        .send({ active: true })
        .expect(200);

      expect(response.body).toMatchObject({
        id: 2,
        active: true,
        nit: '800123456-7',
      });
    });

    it('answers 404 when the client does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/clients/999/status')
        .set('Authorization', 'Bearer token_admin')
        .send({ active: false })
        .expect(404);
    });

    it('rejects a missing active flag with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/clients/1/status')
        .set('Authorization', 'Bearer token_admin')
        .send({})
        .expect(400);
    });

    it('rejects an advisor with 403 Forbidden', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch('/api/clients/1/status')
        .set('Authorization', 'Bearer token_advisor')
        .send({ active: false })
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/clients/1/status')
        .send({ active: false })
        .expect(401);
    });
  });

  describe('Swagger documentation', () => {
    it('documents the clients endpoints in the OpenAPI document', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.paths).toHaveProperty('/api/clients');
      expect(response.body.paths).toHaveProperty('/api/clients/{id}');
      expect(response.body.paths).toHaveProperty('/api/clients/{id}/status');
      expect(response.body.paths['/api/clients'].post.tags).toContain(
        'clients',
      );
    });
  });
});
