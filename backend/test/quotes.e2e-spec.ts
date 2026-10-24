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
import {
  STORAGE,
  type StoragePort,
  type StorageUploadInput,
} from '../src/shared/application/ports/storage.port.js';
import { AttachQuoteDocumentUseCase } from '../src/modules/quotes/application/use-cases/attach-quote-document.use-case.js';
import { GetQuoteDocumentUrlUseCase } from '../src/modules/quotes/application/use-cases/get-quote-document-url.use-case.js';
import { ChangeQuoteStatusUseCase } from '../src/modules/quotes/application/use-cases/change-quote-status.use-case.js';
import { AddQuoteDetailUseCase } from '../src/modules/quotes/application/use-cases/add-quote-detail.use-case.js';
import { CreateQuoteUseCase } from '../src/modules/quotes/application/use-cases/create-quote.use-case.js';
import { GetQuoteUseCase } from '../src/modules/quotes/application/use-cases/get-quote.use-case.js';
import { ListQuoteDetailsUseCase } from '../src/modules/quotes/application/use-cases/list-quote-details.use-case.js';
import { ListQuotesUseCase } from '../src/modules/quotes/application/use-cases/list-quotes.use-case.js';
import { RemoveQuoteDetailUseCase } from '../src/modules/quotes/application/use-cases/remove-quote-detail.use-case.js';
import { UpdateQuoteDetailUseCase } from '../src/modules/quotes/application/use-cases/update-quote-detail.use-case.js';
import { QuoteDetail } from '../src/modules/quotes/domain/entities/quote-detail.js';
import {
  QUOTE_REFERENCES,
  type QuoteReferencesPort,
} from '../src/modules/quotes/domain/ports/quote-references.port.js';
import {
  QUOTE_REPOSITORY,
  type QuoteRepositoryPort,
} from '../src/modules/quotes/domain/ports/quote.repository.port.js';
import {
  QUOTE_DETAIL_REPOSITORY,
  type QuoteDetailRepositoryPort,
} from '../src/modules/quotes/domain/ports/quote-detail.repository.port.js';
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

class InMemoryQuotes implements QuoteRepositoryPort, QuoteDetailRepositoryPort {
  private readonly quotes = new Map<number, Quote>();
  private readonly details = new Map<number, QuoteDetail>();
  private nextId = 1;
  private nextNumber = 1;
  private nextDetailId = 1;

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

  async updateDocumentKey(
    id: number,
    documentKey: string,
  ): Promise<Quote | null> {
    const quote = this.quotes.get(id);
    if (!quote) return null;
    const updated = new Quote({ ...quote, documentKey, updatedAt: new Date() });
    this.quotes.set(id, updated);
    return new Quote({ ...updated });
  }

  async findByQuoteId(quoteId: number): Promise<QuoteDetail[]> {
    return [...this.details.values()]
      .filter((detail) => detail.quoteId === quoteId)
      .sort((left, right) => left.id! - right.id!)
      .map((detail) => new QuoteDetail({ ...detail }));
  }

  async findDetailById(
    quoteId: number,
    detailId: number,
  ): Promise<QuoteDetail | null> {
    const detail = this.details.get(detailId);
    return detail?.quoteId === quoteId ? new QuoteDetail({ ...detail }) : null;
  }

  async add(quoteId: number, detail: QuoteDetail): Promise<QuoteDetail | null> {
    if (!this.quotes.has(quoteId)) return null;
    const saved = new QuoteDetail({
      ...detail,
      id: this.nextDetailId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.details.set(saved.id!, saved);
    this.recalculateQuote(quoteId);
    return new QuoteDetail({ ...saved });
  }

  async update(
    quoteId: number,
    detail: QuoteDetail,
  ): Promise<QuoteDetail | null> {
    const current = this.details.get(detail.id!);
    if (!current || current.quoteId !== quoteId) return null;
    const saved = new QuoteDetail({
      ...detail,
      createdAt: current.createdAt,
      updatedAt: new Date(),
    });
    this.details.set(saved.id!, saved);
    this.recalculateQuote(quoteId);
    return new QuoteDetail({ ...saved });
  }

  async remove(quoteId: number, detailId: number): Promise<boolean> {
    const detail = this.details.get(detailId);
    if (!detail || detail.quoteId !== quoteId) return false;
    this.details.delete(detailId);
    this.recalculateQuote(quoteId);
    return true;
  }

  private recalculateQuote(quoteId: number): void {
    const quote = this.quotes.get(quoteId)!;
    quote.recalculateValue(
      [...this.details.values()].filter((detail) => detail.quoteId === quoteId),
    );
    quote.updatedAt = new Date();
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

/** Almacenamiento falso en memoria: no toca S3 (HU20-T06). */
class FakeStorage implements StoragePort {
  readonly files = new Map<string, StorageUploadInput>();

  async upload(input: StorageUploadInput): Promise<string> {
    this.files.set(input.key, input);
    return input.key;
  }
  async getSignedUrl(key: string): Promise<string> {
    return `https://fake-bucket.test/${key}?signature=abc`;
  }
  async delete(key: string): Promise<void> {
    this.files.delete(key);
  }
}

interface TestContext {
  app: INestApplication<App>;
  activities: RecordedActivities;
  storage: FakeStorage;
}

async function createTestApp(): Promise<TestContext> {
  const quotes = new InMemoryQuotes();
  const activities = new RecordedActivities();
  const storage = new FakeStorage();
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
      { provide: QUOTE_DETAIL_REPOSITORY, useValue: quotes },
      { provide: QUOTE_REFERENCES, useValue: references },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: advisorAccess },
      { provide: ACTIVITY_LOG, useValue: activities },
      { provide: STORAGE, useValue: storage },
      {
        provide: AttachQuoteDocumentUseCase,
        useFactory: () =>
          new AttachQuoteDocumentUseCase(quotes, advisorAccess, storage),
      },
      {
        provide: GetQuoteDocumentUrlUseCase,
        useFactory: () =>
          new GetQuoteDocumentUrlUseCase(quotes, advisorAccess, storage),
      },
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
      {
        provide: ListQuoteDetailsUseCase,
        useFactory: () =>
          new ListQuoteDetailsUseCase(quotes, quotes, advisorAccess),
      },
      {
        provide: AddQuoteDetailUseCase,
        useFactory: () =>
          new AddQuoteDetailUseCase(quotes, quotes, advisorAccess),
      },
      {
        provide: UpdateQuoteDetailUseCase,
        useFactory: () =>
          new UpdateQuoteDetailUseCase(quotes, quotes, advisorAccess),
      },
      {
        provide: RemoveQuoteDetailUseCase,
        useFactory: () =>
          new RemoveQuoteDetailUseCase(quotes, quotes, advisorAccess),
      },
    ],
  }).compile();
  const app = fixture.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, activities, storage };
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

  it('calculates exact subtotals and recalculates the quote total after updates and deletion', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const quote = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ clientId: 1, advisorId: 1, date: '2026-10-22' })
      .expect(201);
    const first = await request(server)
      .post(`/api/quotes/${quote.body.id}/details`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ product: 'Service A', quantity: '1.500', price: '10.250' })
      .expect(201);
    const second = await request(server)
      .post(`/api/quotes/${quote.body.id}/details`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ product: 'Service B', quantity: '2.000', price: '2.125' })
      .expect(201);

    expect(first.body.subtotal).toBe('15.375000');
    expect(second.body.subtotal).toBe('4.250000');
    let current = await request(server)
      .get(`/api/quotes/${quote.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .expect(200);
    expect(current.body.value).toBe('19.625000');
    expect(current.body.details).toHaveLength(2);

    const listedDetails = await request(server)
      .get(`/api/quotes/${quote.body.id}/details`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .expect(200);
    expect(listedDetails.body).toHaveLength(2);
    expect(listedDetails.body[0].subtotal).toBe('15.375000');

    await request(server)
      .patch(`/api/quotes/${quote.body.id}/details/${first.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ price: '11.000' })
      .expect(200)
      .expect(({ body }) => expect(body.subtotal).toBe('16.500000'));
    current = await request(server)
      .get(`/api/quotes/${quote.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .expect(200);
    expect(current.body.value).toBe('20.750000');

    await request(server)
      .delete(`/api/quotes/${quote.body.id}/details/${second.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .expect(204);
    current = await request(server)
      .get(`/api/quotes/${quote.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .expect(200);
    expect(current.body.value).toBe('16.500000');
    expect(current.body.details).toHaveLength(1);
  });

  it('lets an advisor change the details of quotes for clients on their routes', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const own = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ clientId: 1, date: '2026-10-22' })
      .expect(201);
    const other = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ clientId: 2, advisorId: 2, date: '2026-10-22' })
      .expect(201);
    const url = `/api/quotes/${own.body.id}/details`;

    const detail = await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ product: 'Service', quantity: '2.000', price: '10.500' })
      .expect(201);
    expect(detail.body.subtotal).toBe('21.000000');
    await request(server)
      .patch(`${url}/${detail.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ quantity: '3.000' })
      .expect(200)
      .expect(({ body }) => expect(body.subtotal).toBe('31.500000'));
    await request(server)
      .delete(`${url}/${detail.body.id}`)
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .expect(204);
    await request(server)
      .post(`/api/quotes/${other.body.id}/details`)
      .set('Authorization', `Bearer ${TOKENS[advisor.id]}`)
      .send({ product: 'Service', quantity: '1.000', price: '1.000' })
      .expect(404);
  });

  it('rejects amounts that do not fit the decimal columns', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const quote = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ clientId: 1, advisorId: 1, date: '2026-10-22' })
      .expect(201);
    const url = `/api/quotes/${quote.body.id}/details`;

    // More than 11 integer digits for numeric(14,3).
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ product: 'Service', quantity: '999999999999', price: '1' })
      .expect(400);
    // The largest accepted inputs, but their subtotal exceeds numeric(18,6).
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({
        product: 'Service',
        quantity: '99999999999',
        price: '99999999999',
      })
      .expect(400);
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ product: 'Service', quantity: '1', price: '99999999999.999' })
      .expect(201);
  });

  it('rejects invalid amounts, missing sessions, and changes once the quote is sent', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const quote = await request(server)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ clientId: 1, advisorId: 1, date: '2026-10-22' })
      .expect(201);
    const url = `/api/quotes/${quote.body.id}/details`;

    await request(server)
      .post(url)
      .send({ product: 'Service', quantity: '1.000', price: '1.000' })
      .expect(401);
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ product: 'Service', quantity: '0.000', price: '1.000' })
      .expect(400);
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ product: 'Service', quantity: '1.000', price: '-1.000' })
      .expect(400);
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({
        product: 'Service',
        quantity: '1.000',
        price: '1.000',
        subtotal: '999.000000',
      })
      .expect(400);
    const detail = await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ product: 'Service', quantity: '1.000', price: '1.000' })
      .expect(201);
    await request(server)
      .patch(`/api/quotes/${quote.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ status: 'sent' })
      .expect(200);
    // Sent: products and prices are locked for every role.
    for (const token of [TOKENS[admin.id], TOKENS[advisor.id]]) {
      await request(server)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send({ product: 'Service', quantity: '1.000', price: '1.000' })
        .expect(400);
      await request(server)
        .patch(`${url}/${detail.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: '2.000' })
        .expect(400);
      await request(server)
        .delete(`${url}/${detail.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    }
    await request(server)
      .patch(`/api/quotes/${quote.body.id}/status`)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ status: 'approved' })
      .expect(200);
    await request(server)
      .post(url)
      .set('Authorization', `Bearer ${TOKENS[admin.id]}`)
      .send({ product: 'Service', quantity: '1.000', price: '1.000' })
      .expect(400);
  });

  it('documents quote detail endpoints in Swagger', async () => {
    context = await createTestApp();
    const paths = (
      await request(context.app.getHttpServer())
        .get('/api/docs-json')
        .expect(200)
    ).body.paths;
    expect(paths).toHaveProperty('/api/quotes/{id}/details');
    expect(paths).toHaveProperty('/api/quotes/{id}/details/{detailId}');
    expect(paths['/api/quotes/{id}/details'].get.security).toBeDefined();
    expect(paths['/api/quotes/{id}/details'].post.responses).toHaveProperty(
      '201',
    );
    expect(
      paths['/api/quotes/{id}/details/{detailId}'].patch.responses,
    ).toHaveProperty('200');
    expect(
      paths['/api/quotes/{id}/details/{detailId}'].delete.responses,
    ).toHaveProperty('204');
  });
});

describe('Quote document in S3 (HU-20)', () => {
  let context: TestContext | undefined;
  afterEach(async () => context?.app.close());

  const pdf = Buffer.from('%PDF-1.4 contenido de prueba');
  const bearer = (user: AuthUser) => `Bearer ${TOKENS[user.id]}`;

  /** Crea una cotización del cliente 1 (visible para el asesor). */
  async function createQuote(server: App): Promise<number> {
    const created = await request(server)
      .post('/api/quotes')
      .set('Authorization', bearer(admin))
      .send({ clientId: 1, advisorId: 1, date: '2026-10-22' })
      .expect(201);
    return created.body.id as number;
  }

  it('requires a session', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    await request(server).post('/api/quotes/1/document').expect(401);
    await request(server).get('/api/quotes/1/document').expect(401);
  });

  it('attaches a PDF, stores only the key and returns a signed URL', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const id = await createQuote(server);

    const attached = await request(server)
      .post(`/api/quotes/${id}/document`)
      .set('Authorization', bearer(advisor))
      .attach('file', pdf, { filename: 'cotizacion.pdf', contentType: 'application/pdf' })
      .expect(200);

    // CA-04: la BD guarda la key, no una URL.
    expect(attached.body.documentKey).toMatch(
      new RegExp(`^quotes/${id}/[0-9a-f-]{36}\\.pdf$`),
    );
    expect(context.storage.files.get(attached.body.documentKey)?.contentType).toBe(
      'application/pdf',
    );

    // CA-06: el archivo se ve con una URL firmada.
    const signed = await request(server)
      .get(`/api/quotes/${id}/document`)
      .set('Authorization', bearer(advisor))
      .expect(200);
    expect(signed.body.url).toContain(attached.body.documentKey);
  });

  it('deletes the previous file when the document is replaced', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const id = await createQuote(server);
    const first = await request(server)
      .post(`/api/quotes/${id}/document`)
      .set('Authorization', bearer(admin))
      .attach('file', pdf, { filename: 'a.pdf', contentType: 'application/pdf' })
      .expect(200);
    const second = await request(server)
      .post(`/api/quotes/${id}/document`)
      .set('Authorization', bearer(admin))
      .attach('file', Buffer.from('png'), { filename: 'b.png', contentType: 'image/png' })
      .expect(200);

    expect(second.body.documentKey).toMatch(/\.png$/);
    expect(context.storage.files.has(first.body.documentKey)).toBe(false);
    expect(context.storage.files.has(second.body.documentKey)).toBe(true);
  });

  it('rejects a missing file, a wrong type and a file over 5 MB (CA-05)', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const id = await createQuote(server);
    const url = `/api/quotes/${id}/document`;

    await request(server).post(url).set('Authorization', bearer(admin)).expect(400);
    await request(server)
      .post(url)
      .set('Authorization', bearer(admin))
      .attach('file', Buffer.from('hola'), { filename: 'a.txt', contentType: 'text/plain' })
      .expect(400);
    await request(server)
      .post(url)
      .set('Authorization', bearer(admin))
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'grande.pdf',
        contentType: 'application/pdf',
      })
      .expect(413);
    // Nada se subió a S3.
    expect(context.storage.files.size).toBe(0);
  });

  it('hides the document of a quote outside the advisor routes (CA-07)', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    // Cotización del cliente 2: el asesor no lo tiene en sus rutas.
    const other = await request(server)
      .post('/api/quotes')
      .set('Authorization', bearer(admin))
      .send({ clientId: 2, advisorId: 2, date: '2026-10-22' })
      .expect(201);
    const url = `/api/quotes/${other.body.id}/document`;
    await request(server)
      .post(url)
      .set('Authorization', bearer(admin))
      .attach('file', pdf, { filename: 'a.pdf', contentType: 'application/pdf' })
      .expect(200);

    await request(server)
      .post(url)
      .set('Authorization', bearer(advisor))
      .attach('file', pdf, { filename: 'a.pdf', contentType: 'application/pdf' })
      .expect(404);
    await request(server).get(url).set('Authorization', bearer(advisor)).expect(404);
  });

  it('answers 404 when the quote has no document', async () => {
    context = await createTestApp();
    const server = context.app.getHttpServer();
    const id = await createQuote(server);
    await request(server)
      .get(`/api/quotes/${id}/document`)
      .set('Authorization', bearer(admin))
      .expect(404);
  });

  it('documents the document endpoints in Swagger', async () => {
    context = await createTestApp();
    const paths = (
      await request(context.app.getHttpServer()).get('/api/docs-json').expect(200)
    ).body.paths;
    expect(paths['/api/quotes/{id}/document'].post.requestBody.content).toHaveProperty(
      'multipart/form-data',
    );
    expect(paths['/api/quotes/{id}/document'].get.responses).toHaveProperty('200');
  });
});
