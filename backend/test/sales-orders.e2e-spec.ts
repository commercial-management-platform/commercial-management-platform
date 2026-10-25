import { afterEach, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
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
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../src/modules/clients/application/ports/advisor-client-access.port.js';
import {
  ACTIVITY_LOG,
  type ActivityLogEntry,
  type ActivityLogPort,
} from '../src/shared/application/ports/activity-log.port.js';
import { UnauthorizedError } from '../src/shared/domain/errors/index.js';
import { ChangeSalesOrderStatusUseCase } from '../src/modules/sales-orders/application/use-cases/change-sales-order-status.use-case.js';
import { CreateSalesOrderFromQuoteUseCase } from '../src/modules/sales-orders/application/use-cases/create-sales-order-from-quote.use-case.js';
import { CreateSalesOrderUseCase } from '../src/modules/sales-orders/application/use-cases/create-sales-order.use-case.js';
import { GetSalesOrderUseCase } from '../src/modules/sales-orders/application/use-cases/get-sales-order.use-case.js';
import { ListSalesOrdersUseCase } from '../src/modules/sales-orders/application/use-cases/list-sales-orders.use-case.js';
import { SalesOrder } from '../src/modules/sales-orders/domain/entities/sales-order.js';
import type { SalesOrderStatus } from '../src/modules/sales-orders/domain/entities/sales-order-status.js';
import {
  SALES_ORDER_REFERENCES,
  type SalesOrderReferencesPort,
} from '../src/modules/sales-orders/domain/ports/sales-order-references.port.js';
import {
  SALES_ORDER_REPOSITORY,
  type SalesOrderRepositoryPort,
} from '../src/modules/sales-orders/domain/ports/sales-order.repository.port.js';
import { QuoteSalesOrdersController } from '../src/modules/sales-orders/presentation/controllers/quote-sales-orders.controller.js';
import { SalesOrdersController } from '../src/modules/sales-orders/presentation/controllers/sales-orders.controller.js';

function user(id: string, role: UserRole): AuthUser {
  return new AuthUser({
    id,
    email: `${id}@cmp.test`,
    name: id,
    role,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const admin = user('usr_admin', UserRole.Admin);
const advisor = user('usr_advisor', UserRole.Advisor);
const TOKENS = { [admin.id]: 'admin-token', [advisor.id]: 'advisor-token' };

class FakeAuthService implements AuthServicePort {
  constructor(private readonly users: AuthUser[]) {}
  async signInEmail(): Promise<never> {
    throw new UnauthorizedError('Not implemented');
  }
  async signOut(): Promise<void> {}
  async signUpEmail(): Promise<never> {
    throw new UnauthorizedError('Not implemented');
  }
  async verifySession(
    headersOrToken: Record<string, string | string[] | undefined> | string,
  ) {
    const token =
      typeof headersOrToken === 'string'
        ? headersOrToken
        : typeof headersOrToken.authorization === 'string'
          ? headersOrToken.authorization.replace(/^Bearer /, '')
          : undefined;
    const found = this.users.find(
      (candidate) => TOKENS[candidate.id] === token,
    );
    if (!found) return null;
    return {
      user: found,
      session: new AuthSession({
        id: `session-${found.id}`,
        token: token!,
        userId: found.id,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
  }
}

class InMemorySalesOrders implements SalesOrderRepositoryPort {
  private readonly orders = new Map<number, SalesOrder>();
  private nextId = 1;
  private nextNumber = 1;
  async create(order: SalesOrder): Promise<SalesOrder> {
    if (
      order.quoteId !== null &&
      [...this.orders.values()].some(
        (current) => current.quoteId === order.quoteId,
      )
    )
      throw new Error('unique quote_id');
    const saved = new SalesOrder({
      ...order,
      id: this.nextId++,
      number: `PED-${String(this.nextNumber++).padStart(4, '0')}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.orders.set(saved.id!, saved);
    return new SalesOrder({ ...saved });
  }
  async findById(id: number): Promise<SalesOrder | null> {
    const order = this.orders.get(id);
    return order ? new SalesOrder({ ...order }) : null;
  }
  async findByQuoteId(quoteId: number): Promise<SalesOrder | null> {
    const order = [...this.orders.values()].find(
      (current) => current.quoteId === quoteId,
    );
    return order ? new SalesOrder({ ...order }) : null;
  }
  async findPage(
    filter: Parameters<SalesOrderRepositoryPort['findPage']>[0],
    page: { page: number; limit: number },
  ) {
    const items = [...this.orders.values()]
      .filter(
        (order) =>
          (filter.clientId === undefined ||
            order.clientId === filter.clientId) &&
          (filter.advisorId === undefined ||
            order.advisorId === filter.advisorId) &&
          (filter.status === undefined || order.status === filter.status) &&
          (filter.fromDate === undefined || order.date >= filter.fromDate) &&
          (filter.toDate === undefined || order.date <= filter.toDate) &&
          (filter.clientIds === undefined ||
            filter.clientIds.includes(order.clientId)),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id! - a.id!);
    const first = (page.page - 1) * page.limit;
    return {
      items: items
        .slice(first, first + page.limit)
        .map((order) => new SalesOrder({ ...order })),
      total: items.length,
    };
  }
  async updateStatusIfCurrent(
    id: number,
    status: SalesOrderStatus,
    expected: SalesOrderStatus,
  ): Promise<SalesOrder | null> {
    const order = this.orders.get(id);
    if (!order || order.status !== expected) return null;
    const updated = new SalesOrder({ ...order, status, updatedAt: new Date() });
    this.orders.set(id, updated);
    return new SalesOrder({ ...updated });
  }
}

const references: SalesOrderReferencesPort = {
  findClient: async (id) =>
    id === 1 || id === 2 ? { id, active: true } : null,
  findAdvisor: async (id) =>
    id === 1 || id === 2 ? { id, active: true } : null,
  findAdvisorByUserId: async (id) =>
    id === advisor.id ? { id: 1, active: true } : null,
  findVisit: async (id) =>
    id === 10 ? { id, clientId: 1, advisorId: 1 } : null,
  findQuote: async (id) =>
    id === 50
      ? { id, clientId: 1, advisorId: 1, visitId: 10, value: '99.125000' }
      : null,
};
const advisorAccess: AdvisorClientAccessPort = {
  canAccess: async (userId, clientId) =>
    userId === advisor.id && clientId === 1,
  getAccessibleClientIds: async (userId) => (userId === advisor.id ? [1] : []),
};
class RecordedActivities implements ActivityLogPort {
  readonly entries: ActivityLogEntry[] = [];
  async record(entry: ActivityLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}

interface TestContext {
  app: INestApplication<App>;
  orders: InMemorySalesOrders;
  activities: RecordedActivities;
}
async function createTestApp(): Promise<TestContext> {
  const orders = new InMemorySalesOrders();
  const activities = new RecordedActivities();
  const fixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        validate: validateEnv,
      }),
    ],
    controllers: [SalesOrdersController, QuoteSalesOrdersController],
    providers: [
      AuthGuard,
      RolesGuard,
      {
        provide: AUTH_SERVICE_PORT,
        useValue: new FakeAuthService([admin, advisor]),
      },
      { provide: SALES_ORDER_REPOSITORY, useValue: orders },
      { provide: SALES_ORDER_REFERENCES, useValue: references },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: advisorAccess },
      { provide: ACTIVITY_LOG, useValue: activities },
      {
        provide: CreateSalesOrderUseCase,
        useFactory: () =>
          new CreateSalesOrderUseCase(
            orders,
            references,
            advisorAccess,
            activities,
          ),
      },
      {
        provide: CreateSalesOrderFromQuoteUseCase,
        useFactory: (create: CreateSalesOrderUseCase) =>
          new CreateSalesOrderFromQuoteUseCase(orders, references, create),
        inject: [CreateSalesOrderUseCase],
      },
      {
        provide: ListSalesOrdersUseCase,
        useFactory: () => new ListSalesOrdersUseCase(orders, advisorAccess),
      },
      {
        provide: GetSalesOrderUseCase,
        useFactory: () => new GetSalesOrderUseCase(orders, advisorAccess),
      },
      {
        provide: ChangeSalesOrderStatusUseCase,
        useFactory: () => new ChangeSalesOrderStatusUseCase(orders, activities),
      },
    ],
  }).compile();
  const app = fixture.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, orders, activities };
}

describe('Sales orders (HU-14)', () => {
  let context: TestContext | undefined;
  afterEach(async () => context?.app.close());
  it('requires a session', async () => {
    context = await createTestApp();
    await request(context.app.getHttpServer())
      .get('/api/sales-orders')
      .expect(401);
  });
  it('creates orders with unique consecutive numbers, filters them, and records activity', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const first = await request(server)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({
        clientId: 1,
        visitId: 10,
        date: '2026-10-22',
        value: '5.250000',
        estimatedDeliveryDate: '2026-10-25',
      })
      .expect(201);
    const second = await request(server)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({
        clientId: 2,
        advisorId: 2,
        date: '2026-10-23',
        value: '7.000000',
        estimatedDeliveryDate: '2026-10-26',
      })
      .expect(201);
    expect(first.body).toMatchObject({
      number: 'PED-0001',
      value: '5.250000',
      status: 'pending',
      advisorId: 1,
    });
    expect(second.body.number).toBe('PED-0002');
    const page = await request(server)
      .get('/api/sales-orders?clientId=1&page=1&limit=20')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .expect(200);
    expect(page.body).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(page.body.data[0].number).toBe('PED-0001');
    expect(context.activities.entries.map((entry) => entry.action)).toEqual([
      'sales_order.created',
      'sales_order.created',
    ]);
  });
  it('creates an order from a quote and rejects a second order for the same quote', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const created = await request(server)
      .post('/api/quotes/50/sales-order')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ date: '2026-10-23', estimatedDeliveryDate: '2026-10-30' })
      .expect(201);
    expect(created.body).toMatchObject({
      quoteId: 50,
      clientId: 1,
      advisorId: 1,
      // Inherited from the quote (HU-14 CA-04).
      visitId: 10,
      value: '99.125000',
    });
    await request(server)
      .post('/api/quotes/50/sales-order')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ date: '2026-10-23', estimatedDeliveryDate: '2026-10-30' })
      .expect(409);
  });
  it('allows a valid state transition and rejects an invalid one', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const created = await request(server)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({
        clientId: 1,
        advisorId: 1,
        date: '2026-10-22',
        value: '1',
        estimatedDeliveryDate: '2026-10-25',
      })
      .expect(201);
    await request(server)
      .patch(`/api/sales-orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ status: 'confirmed' })
      .expect(200);
    await request(server)
      .patch(`/api/sales-orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ status: 'pending' })
      .expect(400);
    expect(context.activities.entries.at(-1)?.action).toBe(
      'sales_order.status_changed',
    );
  });
  it('rejects an estimated delivery date before the order date', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const body = {
      clientId: 1,
      advisorId: 1,
      date: '2026-10-22',
      value: '1',
    };
    const rejected = await request(server)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ ...body, estimatedDeliveryDate: '2026-10-21' })
      .expect(400);
    expect(rejected.body.message).toContain(
      'estimatedDeliveryDate cannot be before the order date',
    );
    await request(server)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ ...body, estimatedDeliveryDate: '2026-10-22' })
      .expect(201);
    await request(server)
      .post('/api/quotes/50/sales-order')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ date: '2026-10-23', estimatedDeliveryDate: '2026-10-22' })
      .expect(400);
  });
  it('returns 409 when the status was changed concurrently', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const created = await request(server)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({
        clientId: 1,
        advisorId: 1,
        date: '2026-10-22',
        value: '1',
        estimatedDeliveryDate: '2026-10-25',
      })
      .expect(201);
    vi.spyOn(context.orders, 'updateStatusIfCurrent').mockResolvedValueOnce(
      null,
    );
    await request(server)
      .patch(`/api/sales-orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ status: 'confirmed' })
      .expect(409);
  });
  it('enforces advisor route visibility and status-change permissions', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    await request(server)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({
        clientId: 2,
        date: '2026-10-22',
        value: '1',
        estimatedDeliveryDate: '2026-10-25',
      })
      .expect(404);
    const created = await request(server)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({
        clientId: 1,
        advisorId: 1,
        date: '2026-10-22',
        value: '1',
        estimatedDeliveryDate: '2026-10-25',
      })
      .expect(201);
    await request(server)
      .patch(`/api/sales-orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ status: 'confirmed' })
      .expect(403);
  });
  it('documents the endpoints in Swagger', async () => {
    context = await createTestApp();
    const paths = (
      await request(context.app.getHttpServer())
        .get('/api/docs-json')
        .expect(200)
    ).body.paths;
    expect(paths).toHaveProperty('/api/sales-orders');
    expect(paths).toHaveProperty('/api/sales-orders/{id}');
    expect(paths).toHaveProperty('/api/sales-orders/{id}/status');
    expect(paths).toHaveProperty('/api/quotes/{id}/sales-order');
  });
});
