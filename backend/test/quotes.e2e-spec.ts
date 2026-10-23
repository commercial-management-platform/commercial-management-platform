import { afterEach, describe, expect, it } from 'vitest';
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
  ACTIVITY_LOG,
  type ActivityLogEntry,
  type ActivityLogPort,
} from '../src/shared/application/ports/activity-log.port.js';
import { UnauthorizedError } from '../src/shared/domain/errors/index.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../src/modules/clients/application/ports/advisor-client-access.port.js';
import { ChangeQuoteStatusUseCase } from '../src/modules/quotes/application/use-cases/change-quote-status.use-case.js';
import { CreateQuoteUseCase } from '../src/modules/quotes/application/use-cases/create-quote.use-case.js';
import { GetQuoteUseCase } from '../src/modules/quotes/application/use-cases/get-quote.use-case.js';
import { ListQuotesUseCase } from '../src/modules/quotes/application/use-cases/list-quotes.use-case.js';
import {
  QUOTE_REFERENCES,
  type QuoteReferencesPort,
} from '../src/modules/quotes/domain/ports/quote-references.port.js';
import {
  QUOTE_REPOSITORY,
  type QuoteRepositoryPort,
} from '../src/modules/quotes/domain/ports/quote.repository.port.js';
import { Quote } from '../src/modules/quotes/domain/entities/quote.js';
import type { QuoteStatus } from '../src/modules/quotes/domain/entities/quote-status.js';
import { QuotesController } from '../src/modules/quotes/presentation/controllers/quotes.controller.js';

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

class InMemoryQuotes implements QuoteRepositoryPort {
  private readonly quotes = new Map<number, Quote>();
  private nextId = 1;
  private nextNumber = 1;

  async create(quote: Quote): Promise<Quote> {
    const saved = new Quote({
      ...quote,
      id: this.nextId++,
      number: `COT-${String(this.nextNumber++).padStart(4, '0')}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.quotes.set(saved.id!, saved);
    return new Quote({ ...saved });
  }

  async findById(id: number): Promise<Quote | null> {
    const quote = this.quotes.get(id);
    return quote ? new Quote({ ...quote }) : null;
  }

  async findPage(
    filter: Parameters<QuoteRepositoryPort['findPage']>[0],
    page: { page: number; limit: number },
  ) {
    const items = [...this.quotes.values()]
      .filter(
        (quote) =>
          (filter.clientId === undefined ||
            quote.clientId === filter.clientId) &&
          (filter.advisorId === undefined ||
            quote.advisorId === filter.advisorId) &&
          (filter.status === undefined || quote.status === filter.status) &&
          (filter.fromDate === undefined || quote.date >= filter.fromDate) &&
          (filter.toDate === undefined || quote.date <= filter.toDate) &&
          (filter.clientIds === undefined ||
            filter.clientIds.includes(quote.clientId)),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id! - a.id!);
    const first = (page.page - 1) * page.limit;
    return {
      items: items
        .slice(first, first + page.limit)
        .map((quote) => new Quote({ ...quote })),
      total: items.length,
    };
  }

  async updateStatusIfCurrent(
    id: number,
    status: QuoteStatus,
    expected: QuoteStatus,
  ): Promise<Quote | null> {
    const quote = this.quotes.get(id);
    if (!quote || quote.status !== expected) return null;
    const updated = new Quote({ ...quote, status, updatedAt: new Date() });
    this.quotes.set(id, updated);
    return new Quote({ ...updated });
  }
}

const references: QuoteReferencesPort = {
  findClient: async (id) =>
    id === 1 || id === 2 ? { id, active: true } : null,
  findAdvisor: async (id) =>
    id === 1 || id === 2 ? { id, active: true } : null,
  findAdvisorByUserId: async (id) =>
    id === advisor.id ? { id: 1, active: true } : null,
  findVisit: async (id) =>
    id === 10 ? { id, clientId: 1, advisorId: 1 } : null,
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
  activities: RecordedActivities;
}

async function createTestApp(): Promise<TestContext> {
  const quotes = new InMemoryQuotes();
  const activities = new RecordedActivities();
  const fixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        validate: validateEnv,
      }),
    ],
    controllers: [QuotesController],
    providers: [
      AuthGuard,
      RolesGuard,
      {
        provide: AUTH_SERVICE_PORT,
        useValue: new FakeAuthService([admin, advisor]),
      },
      { provide: QUOTE_REPOSITORY, useValue: quotes },
      { provide: QUOTE_REFERENCES, useValue: references },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: advisorAccess },
      { provide: ACTIVITY_LOG, useValue: activities },
      {
        provide: CreateQuoteUseCase,
        useFactory: () =>
          new CreateQuoteUseCase(quotes, references, advisorAccess, activities),
      },
      {
        provide: ListQuotesUseCase,
        useFactory: () => new ListQuotesUseCase(quotes, advisorAccess),
      },
      {
        provide: GetQuoteUseCase,
        useFactory: () => new GetQuoteUseCase(quotes, advisorAccess),
      },
      {
        provide: ChangeQuoteStatusUseCase,
        useFactory: () => new ChangeQuoteStatusUseCase(quotes, activities),
      },
    ],
  }).compile();
  const app = fixture.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, activities };
}

describe('Quotes (HU-12)', () => {
  let context: TestContext | undefined;
  afterEach(async () => context?.app.close());

  it('requires a session', async () => {
    context = await createTestApp();
    await request(context.app.getHttpServer()).get('/api/quotes').expect(401);
  });

  it('creates unique consecutive numbers and records the client activity', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const advisorQuote = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ clientId: 1, visitId: 10, date: '2026-10-22' })
      .expect(201);
    const adminQuote = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ clientId: 2, advisorId: 2, date: '2026-10-23', currency: 'COP' })
      .expect(201);

    expect(advisorQuote.body).toMatchObject({
      number: 'COT-0001',
      value: '0.00',
      status: 'draft',
      advisorId: 1,
    });
    expect(adminQuote.body.number).toBe('COT-0002');
    const page = await request(server)
      .get('/api/quotes?clientId=1&page=1&limit=20')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .expect(200);
    expect(page.body).toMatchObject({ total: 1, page: 1, limit: 20 });
    expect(page.body.data[0].number).toBe('COT-0001');
    const detail = await request(server)
      .get(`/api/quotes/${advisorQuote.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .expect(200);
    expect(detail.body.details).toEqual([]);
    await request(server)
      .get(`/api/quotes/${adminQuote.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .expect(404);
    expect(context.activities.entries.map((entry) => entry.action)).toEqual([
      'quote.created',
      'quote.created',
    ]);
  });

  it('hides a client outside the advisor routes', async () => {
    context = await createTestApp();
    await request(context.app.getHttpServer())
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ clientId: 2, date: '2026-10-22' })
      .expect(404);
  });

  it('allows a valid status transition and rejects an invalid one', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const created = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ clientId: 1, advisorId: 1, date: '2026-10-22' })
      .expect(201);

    await request(server)
      .patch(`/api/quotes/${created.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ status: 'sent' })
      .expect(200);
    await request(server)
      .patch(`/api/quotes/${created.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ status: 'draft' })
      .expect(400);
    expect(context.activities.entries.at(-1)?.action).toBe(
      'quote.status_changed',
    );
  });

  it('rejects status changes by an advisor', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const created = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ clientId: 1, advisorId: 1, date: '2026-10-22' })
      .expect(201);
    await request(server)
      .patch(`/api/quotes/${created.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ status: 'sent' })
      .expect(403);
  });
});
