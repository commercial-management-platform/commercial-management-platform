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
} from '../src/shared/domain/errors/index.js';
import {
  Client,
  type ClientProps,
} from '../src/modules/clients/domain/entities/client.js';
import {
  CLIENT_REPOSITORY,
  type ClientFilterOptions,
  type ClientRepository,
  type UpdateClientData,
} from '../src/modules/clients/domain/repositories/client.repository.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../src/modules/clients/application/ports/advisor-client-access.port.js';
import {
  ACTIVITY_LOG,
  type ActivityLogEntry,
  type ActivityLogPort,
} from '../src/modules/clients/application/ports/activity-log.port.js';
import { CatalogsController } from '../src/modules/catalogs/presentation/catalogs.controller.js';
import { CreateCatalogEntryUseCase } from '../src/modules/catalogs/application/use-cases/create-catalog-entry.use-case.js';
import { GetCatalogEntriesUseCase } from '../src/modules/catalogs/application/use-cases/get-catalog-entries.use-case.js';
import { SetCatalogEntryStatusUseCase } from '../src/modules/catalogs/application/use-cases/set-catalog-entry-status.use-case.js';
import { UpdateCatalogEntryUseCase } from '../src/modules/catalogs/application/use-cases/update-catalog-entry.use-case.js';
import type {
  CatalogEntry,
  CatalogRepository,
  CatalogType,
} from '../src/modules/catalogs/domain/repositories/catalog.repository.js';
import { PortfoliosController } from '../src/modules/portfolios/presentation/portfolios.controller.js';
import { AssociateClientUseCase } from '../src/modules/portfolios/application/use-cases/associate-client.use-case.js';
import { GetPortfolioClientsUseCase } from '../src/modules/portfolios/application/use-cases/get-portfolio-clients.use-case.js';
import { GetPortfolioUseCase } from '../src/modules/portfolios/application/use-cases/get-portfolio.use-case.js';
import { RemoveClientUseCase } from '../src/modules/portfolios/application/use-cases/remove-client.use-case.js';
import {
  CLIENT_PORTFOLIO_REPOSITORY,
  type ClientPortfolioRepository,
} from '../src/modules/portfolios/domain/repositories/client-portfolio.repository.js';
import { ClientPortfolio } from '../src/modules/portfolios/domain/entities/client-portfolio.js';

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
    throw new Error('Not implemented in this test');
  }

  async signOut(): Promise<void> {
    // Sessions are never removed in these tests.
  }

  async signUpEmail(): Promise<never> {
    throw new Error('Not implemented in this test');
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

/**
 * Catalog repository fake with the portfolios of the seed (HU-05). The
 * portfolios module reads them through this repository.
 */
class InMemoryCatalogRepository implements CatalogRepository {
  private readonly rows = new Map<CatalogType, CatalogEntry[]>();

  constructor(entries: Partial<Record<CatalogType, CatalogEntry[]>>) {
    for (const [type, values] of Object.entries(entries)) {
      this.rows.set(type as CatalogType, values);
    }
  }

  async findAll(
    type: CatalogType,
    options?: { includeInactive?: boolean },
  ): Promise<CatalogEntry[]> {
    const entries = this.rows.get(type) ?? [];
    if (options?.includeInactive) return entries;
    return entries.filter((entry) => entry.active);
  }

  async findById(type: CatalogType, id: number): Promise<CatalogEntry | null> {
    const entries = this.rows.get(type) ?? [];
    return entries.find((entry) => entry.id === id) ?? null;
  }

  async findByName(type: CatalogType, name: string): Promise<CatalogEntry | null> {
    const entries = this.rows.get(type) ?? [];
    return entries.find((entry) => entry.name === name) ?? null;
  }

  async create(type: CatalogType, entry: CatalogEntry): Promise<CatalogEntry> {
    const entries = this.rows.get(type) ?? [];
    entries.push(entry);
    this.rows.set(type, entries);
    return entry;
  }

  async update(type: CatalogType, entry: CatalogEntry): Promise<CatalogEntry> {
    const entries = this.rows.get(type) ?? [];
    const index = entries.findIndex((item) => item.id === entry.id);
    if (index >= 0) entries[index] = entry;
    return entry;
  }

  async setActive(type: CatalogType, id: number, active: boolean): Promise<void> {
    const entries = this.rows.get(type) ?? [];
    const entry = entries.find((item) => item.id === id);
    if (entry) entry.active = active;
  }
}

/** Client repository fake with the clients used by the portfolio tests. */
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
    return result;
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
    const updated = new Client({
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.rows.set(id, updated);
    return updated;
  }
}

/**
 * Association repository fake that reproduces the rule of the real repository:
 * a client is associated to a portfolio only once.
 */
class InMemoryClientPortfolioRepository implements ClientPortfolioRepository {
  private readonly rows = new Map<string, ClientPortfolio>();
  private nextId = 1;

  private key(portfolioId: number, clientId: number): string {
    return `${portfolioId}:${clientId}`;
  }

  async findByPortfolio(portfolioId: number): Promise<ClientPortfolio[]> {
    return [...this.rows.values()].filter(
      (association) => association.portfolioId === portfolioId,
    );
  }

  async findAssociation(
    portfolioId: number,
    clientId: number,
  ): Promise<ClientPortfolio | null> {
    return this.rows.get(this.key(portfolioId, clientId)) ?? null;
  }

  async associate(
    portfolioId: number,
    clientId: number,
  ): Promise<ClientPortfolio> {
    const key = this.key(portfolioId, clientId);
    if (this.rows.has(key)) {
      throw new ConflictError('Client already associated to the portfolio');
    }
    const association = new ClientPortfolio(this.nextId++, portfolioId, clientId);
    this.rows.set(key, association);
    return association;
  }

  async removeAssociation(
    portfolioId: number,
    clientId: number,
  ): Promise<void> {
    const key = this.key(portfolioId, clientId);
    if (!this.rows.delete(key)) {
      throw new NotFoundError(
        `Client '${clientId}' is not associated to the portfolio '${portfolioId}'`,
      );
    }
  }
}

/**
 * Advisor visibility fake: the advisor user can only reach the clients of
 * their routes.
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

/** Records every entry written by the portfolio use cases. */
class InMemoryActivityLog implements ActivityLogPort {
  readonly entries: ActivityLogEntry[] = [];

  async record(entry: ActivityLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

interface TestContext {
  app: INestApplication<App>;
  clients: InMemoryClientRepository;
  associations: InMemoryClientPortfolioRepository;
  access: InMemoryAdvisorAccess;
  activityLog: InMemoryActivityLog;
  catalogs: InMemoryCatalogRepository;
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
  const clients = new InMemoryClientRepository();
  const associations = new InMemoryClientPortfolioRepository();
  const access = new InMemoryAdvisorAccess();
  const activityLog = new InMemoryActivityLog();

  const catalogs = new InMemoryCatalogRepository({
    portfolio: [
      {
        id: 1,
        name: 'Portafolio Andino',
        active: true,
        description: 'Clientes del sector andino',
      },
      {
        id: 2,
        name: 'Portafolio Retirado',
        active: false,
        description: null,
      },
    ],
  });

  const routedClient = clients.seed(
    emptyClientProps({
      nit: '900123456-5',
      businessName: 'Distribuidora Andina SAS',
      zoneId: 1,
    }),
  );
  // Second client: it exists but it is not on the advisor's routes.
  clients.seed(
    emptyClientProps({
      nit: '800123456-7',
      businessName: 'Comercializadora Norte Ltda',
      zoneId: 2,
    }),
  );

  access.assign(advisorUser.id, [routedClient.id!]);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        validate: validateEnv,
      }),
    ],
    controllers: [CatalogsController, PortfoliosController],
    providers: [
      {
        provide: AUTH_SERVICE_PORT,
        useValue: new InMemoryAuthService([
          adminUser,
          directorUser,
          advisorUser,
        ]),
      },
      { provide: 'CatalogRepository', useValue: catalogs },
      { provide: CLIENT_REPOSITORY, useValue: clients },
      { provide: CLIENT_PORTFOLIO_REPOSITORY, useValue: associations },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: access },
      { provide: ACTIVITY_LOG, useValue: activityLog },
      {
        provide: GetCatalogEntriesUseCase,
        inject: ['CatalogRepository'],
        useFactory: (c: CatalogRepository) => new GetCatalogEntriesUseCase(c),
      },
      {
        provide: CreateCatalogEntryUseCase,
        inject: ['CatalogRepository'],
        useFactory: (c: CatalogRepository) => new CreateCatalogEntryUseCase(c),
      },
      {
        provide: UpdateCatalogEntryUseCase,
        inject: ['CatalogRepository'],
        useFactory: (c: CatalogRepository) => new UpdateCatalogEntryUseCase(c),
      },
      {
        provide: SetCatalogEntryStatusUseCase,
        inject: ['CatalogRepository'],
        useFactory: (c: CatalogRepository) =>
          new SetCatalogEntryStatusUseCase(c),
      },
      {
        provide: GetPortfolioUseCase,
        inject: ['CatalogRepository'],
        useFactory: (c: CatalogRepository) => new GetPortfolioUseCase(c),
      },
      {
        provide: GetPortfolioClientsUseCase,
        inject: [
          'CatalogRepository',
          CLIENT_PORTFOLIO_REPOSITORY,
          CLIENT_REPOSITORY,
          ADVISOR_CLIENT_ACCESS,
        ],
        useFactory: (
          c: CatalogRepository,
          a: ClientPortfolioRepository,
          cl: ClientRepository,
          ac: AdvisorClientAccessPort,
        ) => new GetPortfolioClientsUseCase(c, a, cl, ac),
      },
      {
        provide: AssociateClientUseCase,
        inject: [
          'CatalogRepository',
          CLIENT_PORTFOLIO_REPOSITORY,
          CLIENT_REPOSITORY,
          ACTIVITY_LOG,
        ],
        useFactory: (
          c: CatalogRepository,
          a: ClientPortfolioRepository,
          cl: ClientRepository,
          l: ActivityLogPort,
        ) => new AssociateClientUseCase(c, a, cl, l),
      },
      {
        provide: RemoveClientUseCase,
        inject: ['CatalogRepository', CLIENT_PORTFOLIO_REPOSITORY, ACTIVITY_LOG],
        useFactory: (
          c: CatalogRepository,
          a: ClientPortfolioRepository,
          l: ActivityLogPort,
        ) => new RemoveClientUseCase(c, a, l),
      },
      AuthGuard,
      RolesGuard,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return { app, clients, associations, access, activityLog, catalogs };
}

/** Associates the first client to the first portfolio. */
async function associateClient(
  context: TestContext,
  portfolioId = 1,
  clientId = 1,
): Promise<void> {
  await request(context.app.getHttpServer())
    .post(`/api/portfolios/${portfolioId}/clients/${clientId}`)
    .set('Authorization', 'Bearer token_admin')
    .expect(201);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Client portfolios (HU-06) - e2e', () => {
  let context: TestContext;

  afterEach(async () => {
    if (context?.app) {
      await context.app.close();
    }
  });

  describe('GET /api/catalogs/portfolios', () => {
    it('lists the portfolios of the seed (list reused from HU-05)', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/catalogs/portfolios')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        name: 'Portafolio Andino',
        active: true,
      });
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/catalogs/portfolios')
        .expect(401);
    });
  });

  describe('GET /api/portfolios/:id', () => {
    it('returns an existing portfolio', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/portfolios/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        name: 'Portafolio Andino',
        description: 'Clientes del sector andino',
        active: true,
      });
    });

    it('answers 404 for a portfolio that does not exist', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/portfolios/999')
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
        .get('/api/portfolios/abc')
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/portfolios/1')
        .expect(401);
    });
  });

  describe('GET /api/portfolios/:id/clients', () => {
    it('lists the clients associated to the portfolio', async () => {
      context = await createTestApp();
      await associateClient(context);

      const response = await request(context.app.getHttpServer())
        .get('/api/portfolios/1/clients')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        businessName: 'Distribuidora Andina SAS',
      });
    });

    it('returns an empty list when the portfolio has no clients', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/portfolios/1/clients')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('hides the clients that are outside the routes of an advisor', async () => {
      context = await createTestApp();
      await associateClient(context, 1, 1);
      await associateClient(context, 1, 2);

      const admin = await request(context.app.getHttpServer())
        .get('/api/portfolios/1/clients')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(admin.body).toHaveLength(2);

      const advisor = await request(context.app.getHttpServer())
        .get('/api/portfolios/1/clients')
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);
      expect(advisor.body).toHaveLength(1);
      expect(advisor.body[0].id).toBe(1);
    });

    it('answers 404 for a portfolio that does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/portfolios/999/clients')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/portfolios/1/clients')
        .expect(401);
    });
  });

  describe('POST /api/portfolios/:id/clients/:clientId', () => {
    it('associates the client to the portfolio and registers the activity log', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/portfolios/1/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(201);

      expect(response.body).toEqual({ success: true });

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'client.portfolio_added',
      );
      expect(entry).toBeDefined();
      expect(entry?.userId).toBe(adminUser.id);
      expect(entry?.clientId).toBe(1);
    });

    it('allows the director to associate clients', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/portfolios/1/clients/1')
        .set('Authorization', 'Bearer token_director')
        .expect(201);
    });

    it('rejects a duplicated association with 409', async () => {
      context = await createTestApp();
      await associateClient(context);

      const response = await request(context.app.getHttpServer())
        .post('/api/portfolios/1/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(
        context.activityLog.entries.filter(
          (e) => e.action === 'client.portfolio_added',
        ),
      ).toHaveLength(1);
    });

    it('rejects a client that does not exist with 404', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/portfolios/1/clients/999')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
      expect(context.activityLog.entries).toHaveLength(0);
    });

    it('rejects a portfolio that does not exist with 404', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/portfolios/999/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
      expect(context.activityLog.entries).toHaveLength(0);
    });

    it('rejects a deactivated portfolio with 400', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/portfolios/2/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(400);

      expect(response.body).toMatchObject({ statusCode: 400 });
      expect(context.activityLog.entries).toHaveLength(0);
    });

    it('rejects an advisor with 403 Forbidden', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/portfolios/1/clients/1')
        .set('Authorization', 'Bearer token_advisor')
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/portfolios/1/clients/1')
        .expect(401);
    });
  });

  describe('DELETE /api/portfolios/:id/clients/:clientId', () => {
    it('removes the association without deleting the client nor the portfolio', async () => {
      context = await createTestApp();
      await associateClient(context);

      const response = await request(context.app.getHttpServer())
        .delete('/api/portfolios/1/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toEqual({ success: true });

      // The association is gone.
      const clients = await request(context.app.getHttpServer())
        .get('/api/portfolios/1/clients')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(clients.body).toEqual([]);

      // The client keeps its data.
      const client = await context.clients.findById(1);
      expect(client?.businessName).toBe('Distribuidora Andina SAS');

      // The portfolio keeps its data.
      const portfolio = await context.catalogs.findById('portfolio', 1);
      expect(portfolio?.name).toBe('Portafolio Andino');

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'client.portfolio_removed',
      );
      expect(entry).toBeDefined();
      expect(entry?.clientId).toBe(1);
    });

    it('answers 404 when the association does not exist', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .delete('/api/portfolios/1/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });

    it('answers 404 when the portfolio does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .delete('/api/portfolios/999/clients/1')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);
    });

    it('rejects an advisor with 403 Forbidden', async () => {
      context = await createTestApp();
      await associateClient(context);

      await request(context.app.getHttpServer())
        .delete('/api/portfolios/1/clients/1')
        .set('Authorization', 'Bearer token_advisor')
        .expect(403);
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();
      await associateClient(context);

      await request(context.app.getHttpServer())
        .delete('/api/portfolios/1/clients/1')
        .expect(401);
    });
  });

  describe('Swagger documentation', () => {
    it('documents the portfolios endpoints in the OpenAPI document', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.paths).toHaveProperty('/api/portfolios/{id}');
      expect(response.body.paths).toHaveProperty(
        '/api/portfolios/{id}/clients',
      );
      expect(response.body.paths).toHaveProperty(
        '/api/portfolios/{id}/clients/{clientId}',
      );
      expect(
        response.body.paths['/api/portfolios/{id}/clients/{clientId}'].post.tags,
      ).toContain('portfolios');
    });
  });
});
