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
import {
  pageOffset,
  type PageRequest,
} from '../src/shared/application/pagination.js';
import type { Client } from '../src/modules/clients/domain/entities/client.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../src/modules/clients/domain/repositories/client.repository.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../src/modules/clients/application/ports/advisor-client-access.port.js';
import { ActivityLogRecord } from '../src/modules/activity-log/domain/entities/activity-log-record.js';
import {
  ACTIVITY_LOG_REPOSITORY,
  type ActivityLogFilter,
  type ActivityLogRepository,
} from '../src/modules/activity-log/domain/ports/activity-log.repository.js';
import { GetClientActivityUseCase } from '../src/modules/activity-log/application/use-cases/get-client-activity.use-case.js';
import { ClientActivityController } from '../src/modules/activity-log/presentation/client-activity.controller.js';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

function user(id: string, role: UserRole): AuthUser {
  return new AuthUser({
    id,
    email: `${id}@cmp.com`,
    name: `${role} user`,
    role,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const users = [
  user('usr_admin_1', UserRole.Admin),
  user('usr_director_1', UserRole.Director),
  user('usr_advisor_1', UserRole.Advisor),
];

/** Auth service fake: the token of each user is `token_<id>`. */
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
    const token =
      typeof headersOrToken === 'string' ? headersOrToken : undefined;
    const found = users.find((u) => `token_${u.id}` === token);
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

/** Same filters, order and pagination as the TypeORM repository. */
class InMemoryActivityLogRepository implements ActivityLogRepository {
  readonly rows: ActivityLogRecord[] = [];

  add(clientId: number, action: ActivityLogRecord['action'], createdAt: string) {
    this.rows.push(
      new ActivityLogRecord({
        id: this.rows.length + 1,
        clientId,
        action,
        userId: 'usr_admin_1',
        userName: 'admin user',
        description: `${action} on client ${clientId}`,
        createdAt: new Date(createdAt),
      }),
    );
  }

  async findPageByClient(
    clientId: number,
    filter: ActivityLogFilter,
    page: PageRequest,
  ) {
    const matching = this.rows
      .filter((row) => row.clientId === clientId)
      .filter((row) => !filter.action || row.action === filter.action)
      .filter((row) => !filter.from || row.createdAt >= filter.from)
      .filter((row) => !filter.to || row.createdAt < filter.to)
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
      );
    const offset = pageOffset(page);
    return {
      items: matching.slice(offset, offset + page.limit),
      total: matching.length,
    };
  }
}

const ROUTED_CLIENT = 10;
const OTHER_CLIENT = 20;

async function createApp() {
  const clients = {
    findById: async (id: number) =>
      [ROUTED_CLIENT, OTHER_CLIENT].includes(id) ? ({ id } as Client) : null,
  } as unknown as ClientRepository;
  const access: AdvisorClientAccessPort = {
    canAccess: async (userId, clientId) =>
      userId === 'usr_advisor_1' && clientId === ROUTED_CLIENT,
    getAccessibleClientIds: async () => [ROUTED_CLIENT],
  };
  const activityLog = new InMemoryActivityLogRepository();
  // Business time is UTC-05:00: 2026-10-20 local spans 05:00Z..next 05:00Z.
  activityLog.add(ROUTED_CLIENT, 'client.created', '2026-10-01T15:00:00Z');
  activityLog.add(ROUTED_CLIENT, 'contact.created', '2026-10-15T15:00:00Z');
  activityLog.add(ROUTED_CLIENT, 'client.updated', '2026-10-20T04:59:00Z');
  activityLog.add(ROUTED_CLIENT, 'client.updated', '2026-10-20T15:00:00Z');
  activityLog.add(OTHER_CLIENT, 'client.created', '2026-10-02T15:00:00Z');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ],
    controllers: [ClientActivityController],
    providers: [
      { provide: AUTH_SERVICE_PORT, useValue: new InMemoryAuthService() },
      { provide: CLIENT_REPOSITORY, useValue: clients },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: access },
      { provide: ACTIVITY_LOG_REPOSITORY, useValue: activityLog },
      {
        provide: GetClientActivityUseCase,
        inject: [CLIENT_REPOSITORY, ADVISOR_CLIENT_ACCESS, ACTIVITY_LOG_REPOSITORY],
        useFactory: (
          c: ClientRepository,
          a: AdvisorClientAccessPort,
          l: ActivityLogRepository,
        ) => new GetClientActivityUseCase(c, a, l),
      },
      AuthGuard,
      RolesGuard,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Client activity history (HU-16) - e2e', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app?.close();
  });

  const get = (path: string, token?: string) => {
    const req = request(app.getHttpServer()).get(`/api${path}`);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('rejects a request without session with 401', async () => {
    app = await createApp();
    await get(`/clients/${ROUTED_CLIENT}/activity`).expect(401);
  });

  it('returns the history newest first with the standard pagination (CA-02, CA-05)', async () => {
    app = await createApp();

    const res = await get(
      `/clients/${ROUTED_CLIENT}/activity`,
      'token_usr_director_1',
    ).expect(200);

    expect(res.body.total).toBe(4);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
    expect(res.body.data.map((e: { id: number }) => e.id)).toEqual([
      4, 3, 2, 1,
    ]);
    expect(res.body.data[0]).toEqual({
      id: 4,
      clientId: ROUTED_CLIENT,
      action: 'client.updated',
      description: `client.updated on client ${ROUTED_CLIENT}`,
      createdAt: '2026-10-20T15:00:00.000Z',
      user: { id: 'usr_admin_1', name: 'admin user' },
    });
  });

  it('paginates with page and limit', async () => {
    app = await createApp();

    const res = await get(
      `/clients/${ROUTED_CLIENT}/activity?page=2&limit=3`,
      'token_usr_admin_1',
    ).expect(200);

    expect(res.body).toMatchObject({ total: 4, page: 2, limit: 3 });
    expect(res.body.data.map((e: { id: number }) => e.id)).toEqual([1]);
  });

  it('filters by action', async () => {
    app = await createApp();

    const res = await get(
      `/clients/${ROUTED_CLIENT}/activity?action=client.updated`,
      'token_usr_admin_1',
    ).expect(200);

    expect(res.body.total).toBe(2);
    expect(
      res.body.data.every((e: { action: string }) => e.action === 'client.updated'),
    ).toBe(true);
  });

  it('filters by business-time days, both ends included', async () => {
    app = await createApp();

    // 2026-10-20T04:59Z is still 2026-10-19 in Bogota, so only entry 4 is on the 20th.
    const day = await get(
      `/clients/${ROUTED_CLIENT}/activity?from=2026-10-20&to=2026-10-20`,
      'token_usr_admin_1',
    ).expect(200);
    expect(day.body.data.map((e: { id: number }) => e.id)).toEqual([4]);

    const range = await get(
      `/clients/${ROUTED_CLIENT}/activity?from=2026-10-01&to=2026-10-15`,
      'token_usr_admin_1',
    ).expect(200);
    expect(range.body.data.map((e: { id: number }) => e.id)).toEqual([2, 1]);
  });

  it('lets an advisor read a client on their routes (CA-06)', async () => {
    app = await createApp();

    const res = await get(
      `/clients/${ROUTED_CLIENT}/activity`,
      'token_usr_advisor_1',
    ).expect(200);
    expect(res.body.total).toBe(4);
  });

  it('answers 404 to an advisor for a client outside their routes (CA-06)', async () => {
    app = await createApp();

    await get(
      `/clients/${OTHER_CLIENT}/activity`,
      'token_usr_advisor_1',
    ).expect(404);
  });

  it('answers 404 for a client that does not exist', async () => {
    app = await createApp();
    await get('/clients/999/activity', 'token_usr_admin_1').expect(404);
  });

  it.each([
    ['a non-numeric clientId', '/clients/abc/activity'],
    ['an unknown action', `/clients/${ROUTED_CLIENT}/activity?action=client.deleted`],
    ['a malformed date', `/clients/${ROUTED_CLIENT}/activity?from=20-10-2026`],
    ['an impossible date', `/clients/${ROUTED_CLIENT}/activity?to=2026-02-30`],
    ['from after to', `/clients/${ROUTED_CLIENT}/activity?from=2026-10-31&to=2026-10-01`],
    ['a limit above 100', `/clients/${ROUTED_CLIENT}/activity?limit=101`],
  ])('rejects %s with 400', async (_, path) => {
    app = await createApp();
    await get(path, 'token_usr_admin_1').expect(400);
  });

  it.each(['post', 'patch', 'put', 'delete'] as const)(
    'exposes no %s on the history: entries are immutable (CA-04)',
    async (method) => {
      app = await createApp();
      await request(app.getHttpServer())
        [method](`/api/clients/${ROUTED_CLIENT}/activity`)
        .set('Authorization', 'Bearer token_usr_admin_1')
        .send({ action: 'client.updated', userId: 'usr_advisor_1' })
        .expect(404);
    },
  );

  it('documents the endpoint in Swagger (CA-08)', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    const operation = res.body.paths['/api/clients/{clientId}/activity']?.get;
    expect(operation).toBeDefined();
    expect(Object.keys(operation.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401', '403', '404']),
    );
    const params = operation.parameters.map((p: { name: string }) => p.name);
    expect(params).toEqual(
      expect.arrayContaining(['clientId', 'page', 'limit', 'action', 'from', 'to']),
    );
  });
});
