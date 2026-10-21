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
  UnauthorizedError,
} from '../src/shared/domain/errors/index.js';
import {
  CATALOG_LOOKUP,
  type CatalogLookupPort,
  type CatalogName,
} from '../src/modules/catalogs/application/ports/catalog-lookup.port.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../src/modules/clients/domain/repositories/client.repository.js';
import { Client } from '../src/modules/clients/domain/entities/client.js';
import { RoutesController } from '../src/modules/routes/presentation/routes.controller.js';
import { CreateRouteUseCase } from '../src/modules/routes/application/create-route.use-case.js';
import { ListRoutesUseCase } from '../src/modules/routes/application/list-routes.use-case.js';
import { GetRouteUseCase } from '../src/modules/routes/application/get-route.use-case.js';
import { UpdateRouteUseCase } from '../src/modules/routes/application/update-route.use-case.js';
import { GetRouteClientsUseCase } from '../src/modules/routes/application/get-route-clients.use-case.js';
import { AssociateClientUseCase } from '../src/modules/routes/application/associate-client.use-case.js';
import { RemoveClientUseCase } from '../src/modules/routes/application/remove-client.use-case.js';
import { ReorderClientsUseCase } from '../src/modules/routes/application/reorder-clients.use-case.js';
import {
  ADVISOR_LOOKUP,
  type AdvisorLookupPort,
} from '../src/modules/routes/application/ports/advisor-lookup.port.js';
import {
  ROUTE_REPOSITORY,
  type RouteFilterOptions,
  type RouteRepository,
  type VisitOrderItem,
} from '../src/modules/routes/domain/route.repository.js';
import { Route } from '../src/modules/routes/domain/route.js';
import { RouteClient } from '../src/modules/routes/domain/route-client.js';
import { RouteStatus } from '../src/modules/routes/domain/route-status.js';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function authUser(id: string, role: UserRole): AuthUser {
  return new AuthUser({
    id,
    email: `${id}@cmp.com`,
    name: id,
    role,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const adminUser = authUser('usr_admin_1', UserRole.Admin);
const directorUser = authUser('usr_director_1', UserRole.Director);
const advisorUser = authUser('usr_advisor_1', UserRole.Advisor);

const TOKEN_BY_USER: Record<string, string> = {
  [adminUser.id]: 'token_admin',
  [directorUser.id]: 'token_director',
  [advisorUser.id]: 'token_advisor',
};

/**
 * Rows of the advisor table: advisor.id -> user_id and status. Advisor 1 is
 * the session advisor, 2 is another advisor and 3 is inactive.
 */
const ADVISORS = new Map<number, { userId: string; active: boolean }>([
  [1, { userId: advisorUser.id, active: true }],
  [2, { userId: 'usr_advisor_2', active: true }],
  [3, { userId: 'usr_advisor_3', active: false }],
]);

/** Zones 1 and 2 are active; zone 9 exists but was deactivated. */
const ACTIVE_ZONES = new Set([1, 2]);

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

/**
 * Route repository fake. It reproduces the join route -> advisor.user_id and
 * the unique (route_id, client_id) constraint.
 */
class InMemoryRouteRepository implements RouteRepository {
  private readonly routes = new Map<number, Route>();
  private readonly associations: RouteClient[] = [];
  private nextRouteId = 1;
  private nextAssociationId = 1;

  async findAll(options?: RouteFilterOptions): Promise<Route[]> {
    const userId = options?.advisorUserId;
    return [...this.routes.values()].filter(
      (route) =>
        userId === undefined ||
        ADVISORS.get(route.advisorId)?.userId === userId,
    );
  }

  async findById(id: number): Promise<Route | null> {
    return this.routes.get(id) ?? null;
  }

  async isAssignedToAdvisorUser(
    routeId: number,
    userId: string,
  ): Promise<boolean> {
    const route = this.routes.get(routeId);
    return !!route && ADVISORS.get(route.advisorId)?.userId === userId;
  }

  async save(route: Route): Promise<Route> {
    const saved = new Route(
      this.nextRouteId++,
      route.name,
      route.zoneId,
      route.executionDays,
      route.frequency,
      route.suggestedStartTime,
      route.suggestedEndTime,
      route.description,
      route.advisorId,
      route.startDate,
      route.endDate,
      route.status,
    );
    this.routes.set(saved.id!, saved);
    return saved;
  }

  async update(route: Route): Promise<Route> {
    this.routes.set(route.id!, route);
    return route;
  }

  async findClients(routeId: number): Promise<RouteClient[]> {
    return this.associations
      .filter((a) => a.routeId === routeId)
      .sort((a, b) => a.visitOrder - b.visitOrder);
  }

  async findAssociation(
    routeId: number,
    clientId: number,
  ): Promise<RouteClient | null> {
    return (
      this.associations.find(
        (a) => a.routeId === routeId && a.clientId === clientId,
      ) ?? null
    );
  }

  async associate(
    routeId: number,
    clientId: number,
    visitOrder: number,
  ): Promise<RouteClient> {
    if (await this.findAssociation(routeId, clientId)) {
      throw new ConflictError('Client already associated');
    }
    const association = new RouteClient(
      this.nextAssociationId++,
      routeId,
      clientId,
      visitOrder,
    );
    this.associations.push(association);
    return association;
  }

  async removeAssociation(routeId: number, clientId: number): Promise<void> {
    const index = this.associations.findIndex(
      (a) => a.routeId === routeId && a.clientId === clientId,
    );
    if (index >= 0) this.associations.splice(index, 1);
  }

  async reorder(routeId: number, items: VisitOrderItem[]): Promise<void> {
    for (const item of items) {
      const association = this.associations.find(
        (a) => a.routeId === routeId && a.clientId === item.clientId,
      );
      if (association) association.visitOrder = item.visitOrder;
    }
  }
}

/** Client repository fake: clients 1 and 2 exist. */
function clientRepository(): ClientRepository {
  const clients = [1, 2].map(
    (id) =>
      new Client({
        id,
        nit: `90012345${id}-5`,
        businessName: `Client ${id}`,
        tradeName: null,
        address: null,
        department: null,
        municipality: null,
        neighborhood: null,
        phone: null,
        email: null,
        zoneId: 1,
        clientTypeId: null,
        clientPotentialId: null,
        clientStatusId: null,
        visitFrequencyDays: null,
        latitude: null,
        longitude: null,
        active: true,
        createdAt: null,
        updatedAt: null,
      }),
  );
  const notUsed = (): never => {
    throw new Error('Not used by the routes module');
  };
  return {
    findAll: async () => clients,
    findById: async (id: number) => clients.find((c) => c.id === id) ?? null,
    findByNit: notUsed,
    save: notUsed,
    update: notUsed,
  };
}

const catalogLookup: CatalogLookupPort = {
  isActive: async (catalog: CatalogName, id: number): Promise<boolean> =>
    catalog === 'zone' && ACTIVE_ZONES.has(id),
};

const advisorLookup: AdvisorLookupPort = {
  isActive: async (advisorId: number): Promise<boolean> =>
    ADVISORS.get(advisorId)?.active === true,
};

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

interface TestContext {
  app: INestApplication<App>;
  /** Route 1 belongs to the session advisor (advisor 1). */
  ownRoute: Route;
  /** Route 2 belongs to another advisor (advisor 2). */
  otherRoute: Route;
}

function routeProps(name: string, advisorId: number, zoneId = 1): Route {
  return new Route(
    null,
    name,
    zoneId,
    null,
    null,
    null,
    null,
    null,
    advisorId,
    '2026-01-01',
    null,
    RouteStatus.Active,
  );
}

async function createTestApp(): Promise<TestContext> {
  const routes = new InMemoryRouteRepository();
  const ownRoute = await routes.save(routeProps('RUT-OWN', 1));
  // Assigned to zone 9, which was deactivated after the assignment.
  const otherRoute = await routes.save(routeProps('RUT-OTHER', 2, 9));
  await routes.associate(ownRoute.id!, 1, 1);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        validate: validateEnv,
      }),
    ],
    controllers: [RoutesController],
    providers: [
      {
        provide: AUTH_SERVICE_PORT,
        useValue: new InMemoryAuthService([
          adminUser,
          directorUser,
          advisorUser,
        ]),
      },
      { provide: ROUTE_REPOSITORY, useValue: routes },
      { provide: CLIENT_REPOSITORY, useValue: clientRepository() },
      { provide: CATALOG_LOOKUP, useValue: catalogLookup },
      { provide: ADVISOR_LOOKUP, useValue: advisorLookup },
      {
        provide: CreateRouteUseCase,
        inject: [ROUTE_REPOSITORY, CATALOG_LOOKUP, ADVISOR_LOOKUP],
        useFactory: (
          r: RouteRepository,
          c: CatalogLookupPort,
          a: AdvisorLookupPort,
        ) => new CreateRouteUseCase(r, c, a),
      },
      {
        provide: UpdateRouteUseCase,
        inject: [ROUTE_REPOSITORY, CATALOG_LOOKUP, ADVISOR_LOOKUP],
        useFactory: (
          r: RouteRepository,
          c: CatalogLookupPort,
          a: AdvisorLookupPort,
        ) => new UpdateRouteUseCase(r, c, a),
      },
      {
        provide: ListRoutesUseCase,
        inject: [ROUTE_REPOSITORY],
        useFactory: (r: RouteRepository) => new ListRoutesUseCase(r),
      },
      {
        provide: GetRouteUseCase,
        inject: [ROUTE_REPOSITORY],
        useFactory: (r: RouteRepository) => new GetRouteUseCase(r),
      },
      {
        provide: GetRouteClientsUseCase,
        inject: [ROUTE_REPOSITORY],
        useFactory: (r: RouteRepository) => new GetRouteClientsUseCase(r),
      },
      {
        provide: AssociateClientUseCase,
        inject: [ROUTE_REPOSITORY, CLIENT_REPOSITORY],
        useFactory: (r: RouteRepository, c: ClientRepository) =>
          new AssociateClientUseCase(r, c),
      },
      {
        provide: RemoveClientUseCase,
        inject: [ROUTE_REPOSITORY],
        useFactory: (r: RouteRepository) => new RemoveClientUseCase(r),
      },
      {
        provide: ReorderClientsUseCase,
        inject: [ROUTE_REPOSITORY],
        useFactory: (r: RouteRepository) => new ReorderClientsUseCase(r),
      },
      AuthGuard,
      RolesGuard,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return { app, ownRoute, otherRoute };
}

const validRoute = {
  name: 'RUT-NEW',
  zoneId: 1,
  advisorId: 1,
  startDate: '2026-01-01',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Commercial route management (HU-07) - e2e', () => {
  let context: TestContext;

  afterEach(async () => {
    if (context?.app) {
      await context.app.close();
    }
  });

  describe('Authentication', () => {
    it.each([
      ['get', '/api/routes'],
      ['post', '/api/routes'],
      ['get', '/api/routes/1'],
      ['patch', '/api/routes/1'],
      ['get', '/api/routes/1/clients'],
      ['post', '/api/routes/1/clients/2'],
      ['delete', '/api/routes/1/clients/1'],
      ['patch', '/api/routes/1/clients/order'],
    ] as const)(
      'rejects %s %s without a token with 401',
      async (method, url) => {
        context = await createTestApp();

        const response = await request(context.app.getHttpServer())
          [method](url)
          .send({})
          .expect(401);

        expect(response.body).toMatchObject({
          statusCode: 401,
          error: 'Unauthorized',
        });
      },
    );
  });

  describe('POST /api/routes', () => {
    it.each([
      ['admin', 'token_admin'],
      ['director', 'token_director'],
    ])('lets the %s create a route', async (_role, token) => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/routes')
        .set('Authorization', `Bearer ${token}`)
        .send(validRoute)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'RUT-NEW',
        zoneId: 1,
        advisorId: 1,
        // The date must not shift a day because of the server time zone.
        startDate: '2026-01-01',
        status: 'active',
      });
      expect(typeof response.body.id).toBe('number');
    });

    it('rejects an advisor with 403 Forbidden', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/routes')
        .set('Authorization', 'Bearer token_advisor')
        .send(validRoute)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        message: expect.stringContaining("role 'advisor'"),
      });
    });

    it.each([
      ['a zone that does not exist', { zoneId: 999 }, "zone id '999'"],
      ['an inactive zone', { zoneId: 9 }, "zone id '9'"],
      [
        'an advisor that does not exist',
        { advisorId: 999 },
        "advisor id '999'",
      ],
      ['an inactive advisor', { advisorId: 3 }, "advisor id '3'"],
    ])('rejects %s with 400', async (_case, override, message) => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/routes')
        .set('Authorization', 'Bearer token_admin')
        .send({ ...validRoute, ...override })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: `Unknown or inactive ${message}`,
      });
    });

    it.each([
      ['an unknown status', { status: 'lo-que-sea' }],
      ['an invalid time', { suggestedStartTime: '99:99' }],
      ['a date with time', { startDate: '2026-01-01T10:00:00Z' }],
      ['a missing name', { name: undefined }],
    ])('rejects %s with 400', async (_case, override) => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/routes')
        .set('Authorization', 'Bearer token_admin')
        .send({ ...validRoute, ...override })
        .expect(400);
    });
  });

  describe('GET /api/routes', () => {
    it('lists every route for an admin', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/routes')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body.map((r: { name: string }) => r.name)).toEqual([
        'RUT-OWN',
        'RUT-OTHER',
      ]);
    });

    it('only lists the routes of the session advisor', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/routes')
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ name: 'RUT-OWN', advisorId: 1 });
    });

    it('ignores an advisor filter sent in the query', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/routes')
        .query({ advisorUserId: 'usr_advisor_2', advisorId: 2 })
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body.map((r: { name: string }) => r.name)).toEqual([
        'RUT-OWN',
      ]);
    });
  });

  describe('GET /api/routes/:id', () => {
    it('returns any route to the director', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get(`/api/routes/${context.otherRoute.id}`)
        .set('Authorization', 'Bearer token_director')
        .expect(200);
    });

    it('returns their own route to an advisor', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get(`/api/routes/${context.ownRoute.id}`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body.name).toBe('RUT-OWN');
    });

    it('answers 404 to an advisor for a route of another advisor', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get(`/api/routes/${context.otherRoute.id}`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });

    it('answers 404 for a route that does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/routes/999')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);
    });

    it('answers 400 for a non-numeric id', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/routes/abc')
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });
  });

  describe('PATCH /api/routes/:id', () => {
    it('keeps a zone and advisor deactivated after the assignment', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/routes/${context.otherRoute.id}`)
        .set('Authorization', 'Bearer token_director')
        .send({ description: 'updated', zoneId: 9 })
        .expect(200);

      expect(response.body).toMatchObject({
        description: 'updated',
        zoneId: 9,
        advisorId: 2,
      });
    });

    it('rejects a change to an inactive advisor with 400', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/routes/${context.ownRoute.id}`)
        .set('Authorization', 'Bearer token_admin')
        .send({ advisorId: 3 })
        .expect(400);

      expect(response.body.message).toBe("Unknown or inactive advisor id '3'");
    });

    it('rejects a change to an inactive zone with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch(`/api/routes/${context.ownRoute.id}`)
        .set('Authorization', 'Bearer token_admin')
        .send({ zoneId: 9 })
        .expect(400);
    });

    it('rejects an advisor with 403, even on their own route', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch(`/api/routes/${context.ownRoute.id}`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ description: 'mine' })
        .expect(403);
    });

    it('answers 404 when the route does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/routes/999')
        .set('Authorization', 'Bearer token_admin')
        .send({ description: 'x' })
        .expect(404);
    });
  });

  describe('Route clients', () => {
    it('associates, rejects a duplicate, reorders and removes clients', async () => {
      context = await createTestApp();
      const server = context.app.getHttpServer();
      const id = context.ownRoute.id;

      await request(server)
        .post(`/api/routes/${id}/clients/2`)
        .set('Authorization', 'Bearer token_admin')
        .expect(201);
      await request(server)
        .post(`/api/routes/${id}/clients/2`)
        .set('Authorization', 'Bearer token_admin')
        .expect(409);

      const listed = await request(server)
        .get(`/api/routes/${id}/clients`)
        .set('Authorization', 'Bearer token_director')
        .expect(200);
      expect(
        listed.body.map((c: { clientId: number; visitOrder: number }) => [
          c.clientId,
          c.visitOrder,
        ]),
      ).toEqual([
        [1, 1],
        [2, 2],
      ]);

      await request(server)
        .patch(`/api/routes/${id}/clients/order`)
        .set('Authorization', 'Bearer token_director')
        .send({ clientIds: [2, 1] })
        .expect(200);
      const reordered = await request(server)
        .get(`/api/routes/${id}/clients`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(
        reordered.body.map((c: { clientId: number }) => c.clientId),
      ).toEqual([2, 1]);

      await request(server)
        .delete(`/api/routes/${id}/clients/2`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      await request(server)
        .delete(`/api/routes/${id}/clients/2`)
        .set('Authorization', 'Bearer token_admin')
        .expect(404);
    });

    it('answers 404 for a client that does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/routes/${context.ownRoute.id}/clients/999`)
        .set('Authorization', 'Bearer token_admin')
        .expect(404);
    });

    it.each([
      ['a client outside the route', { clientIds: [1, 2] }],
      [
        'a repeated visitOrder',
        {
          items: [
            { clientId: 1, visitOrder: 1 },
            { clientId: 1, visitOrder: 1 },
          ],
        },
      ],
      ['both clientIds and items', { clientIds: [1], items: [] }],
    ])('rejects a reorder with %s with 400', async (_case, body) => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch(`/api/routes/${context.ownRoute.id}/clients/order`)
        .set('Authorization', 'Bearer token_admin')
        .send(body)
        .expect(400);
    });

    it('lets an advisor list the clients of their own route', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get(`/api/routes/${context.ownRoute.id}/clients`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('answers 404 to an advisor for the clients of another route', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get(`/api/routes/${context.otherRoute.id}/clients`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(404);
    });

    it.each([
      ['post', '/clients/2', {}],
      ['delete', '/clients/1', {}],
      ['patch', '/clients/order', { clientIds: [1] }],
    ] as const)(
      'rejects an advisor with 403 on %s %s',
      async (method, path, body) => {
        context = await createTestApp();

        await request(context.app.getHttpServer())
          [method](`/api/routes/${context.ownRoute.id}${path}`)
          .set('Authorization', 'Bearer token_advisor')
          .send(body)
          .expect(403);
      },
    );
  });

  describe('Swagger documentation', () => {
    it('documents the routes endpoints with bearer auth', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const paths = response.body.paths;
      expect(paths).toHaveProperty('/api/routes');
      expect(paths).toHaveProperty('/api/routes/{id}');
      expect(paths).toHaveProperty('/api/routes/{id}/clients');
      expect(paths).toHaveProperty('/api/routes/{id}/clients/{clientId}');
      expect(paths).toHaveProperty('/api/routes/{id}/clients/order');
      expect(paths['/api/routes'].post.tags).toContain('routes');
      expect(paths['/api/routes'].post.security).toBeDefined();
      expect(paths['/api/routes'].post.responses).toHaveProperty('403');
    });
  });
});
