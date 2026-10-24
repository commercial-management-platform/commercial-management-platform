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
import { businessToday } from '../src/shared/domain/time/business-time.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../src/modules/clients/application/ports/advisor-client-access.port.js';
import { VisitStatus } from '../src/modules/visits/domain/visit-status.js';
import type {
  QuoteReportRow,
  SalesOrderReportRow,
  VisitTrackingRow,
} from '../src/modules/reports/domain/entities/report-rows.js';
import {
  REPORT_SOURCES,
  type CommercialDocumentFilter,
  type ReportSourcesPort,
  type VisitTrackingFilter,
} from '../src/modules/reports/domain/ports/report-sources.port.js';
import { ExportVisitTrackingUseCase } from '../src/modules/reports/application/use-cases/export-visit-tracking.use-case.js';
import {
  ExportQuotesUseCase,
  ExportSalesOrdersUseCase,
} from '../src/modules/reports/application/use-cases/export-commercial-documents.use-case.js';
import { ReportsController } from '../src/modules/reports/presentation/controllers/reports.controller.js';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const users = [UserRole.Admin, UserRole.Director, UserRole.Advisor].map(
  (role) =>
    new AuthUser({
      id: `usr_${role}`,
      email: `${role}@cmp.com`,
      name: `${role} user`,
      role,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
);

/** Auth service fake: the token of each user is `token_<role>`. */
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
    const found = users.find((u) => `token_${u.role}` === headersOrToken);
    if (!found) return null;
    return {
      user: found,
      session: new AuthSession({
        id: `sess_${found.id}`,
        token: `token_${found.role}`,
        userId: found.id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
  }
}

const visits: VisitTrackingRow[] = [
  {
    visitId: 2,
    scheduledDate: new Date('2026-10-27T03:00:00Z'),
    clientName: 'Ferretería "El Tornillo", S.A.S',
    municipality: 'Barranquilla',
    clientType: 'Retail',
    clientPotential: 'Alto',
    status: VisitStatus.Visited,
    quoteValue: '1500000.500000',
    result: 'Interesado',
  },
  {
    visitId: 1,
    scheduledDate: new Date('2026-10-20T15:00:00Z'),
    clientName: 'Ñandú Ltda',
    municipality: null,
    clientType: null,
    clientPotential: null,
    status: VisitStatus.Scheduled,
    quoteValue: null,
    result: null,
  },
];

const quote: QuoteReportRow = {
  number: 'COT-0001',
  date: '2026-10-20',
  clientName: 'Acme',
  clientNit: '900123456-5',
  advisorName: 'Asesor Uno',
  status: 'sent',
  value: '250000.000000',
  currency: 'COP',
};

const order: SalesOrderReportRow = {
  number: 'PED-0001',
  date: '2026-10-21',
  clientName: 'Acme',
  clientNit: '900123456-5',
  advisorName: 'Asesor Uno',
  quoteNumber: null,
  status: 'pending',
  value: '99.900000',
  estimatedDeliveryDate: '2026-10-28',
};

async function* fromArray<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) yield item;
}

/** Records the filters it receives; `fail` makes the query break on open. */
class FakeReportSources implements ReportSourcesPort {
  readonly visitFilters: VisitTrackingFilter[] = [];
  readonly documentFilters: CommercialDocumentFilter<unknown>[] = [];
  fail = false;

  visitTracking(filter: VisitTrackingFilter) {
    this.visitFilters.push(filter);
    return this.rows(visits);
  }

  quotes(filter: CommercialDocumentFilter<unknown>) {
    this.documentFilters.push(filter);
    return this.rows([quote]);
  }

  salesOrders(filter: CommercialDocumentFilter<unknown>) {
    this.documentFilters.push(filter);
    return this.rows([order]);
  }

  private rows<T>(items: T[]): AsyncIterable<T> {
    if (!this.fail) return fromArray(items);
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.reject(new Error('connection refused')),
      }),
    };
  }
}

async function createApp() {
  const sources = new FakeReportSources();
  const access: AdvisorClientAccessPort = {
    canAccess: async () => true,
    getAccessibleClientIds: async () => [10],
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ],
    controllers: [ReportsController],
    providers: [
      { provide: AUTH_SERVICE_PORT, useValue: new InMemoryAuthService() },
      { provide: REPORT_SOURCES, useValue: sources },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: access },
      {
        provide: ExportVisitTrackingUseCase,
        inject: [REPORT_SOURCES],
        useFactory: (s: ReportSourcesPort) => new ExportVisitTrackingUseCase(s),
      },
      {
        provide: ExportQuotesUseCase,
        inject: [REPORT_SOURCES, ADVISOR_CLIENT_ACCESS],
        useFactory: (s: ReportSourcesPort, a: AdvisorClientAccessPort) =>
          new ExportQuotesUseCase(s, a),
      },
      {
        provide: ExportSalesOrdersUseCase,
        inject: [REPORT_SOURCES, ADVISOR_CLIENT_ACCESS],
        useFactory: (s: ReportSourcesPort, a: AdvisorClientAccessPort) =>
          new ExportSalesOrdersUseCase(s, a),
      },
      AuthGuard,
      RolesGuard,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return { app, sources };
}

/** Keeps the raw bytes, so the BOM is checked as it is sent. */
function rawBody(
  res: NodeJS.ReadableStream,
  callback: (err: Error | null, body: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CSV reports (HU-17) - e2e', () => {
  let app: INestApplication<App>;
  let sources: FakeReportSources;

  afterEach(async () => {
    await app?.close();
  });

  const download = (path: string, role?: UserRole) => {
    const req = request(app.getHttpServer())
      .get(`/api/reports/${path}`)
      .buffer(true)
      .parse(rawBody);
    return role ? req.set('Authorization', `Bearer token_${role}`) : req;
  };

  it('rejects an export without session with 401', async () => {
    ({ app, sources } = await createApp());
    await request(app.getHttpServer())
      .get('/api/reports/visit-tracking/export')
      .expect(401);
  });

  it('downloads the tracking CSV: headers, BOM, Spanish columns and RFC 4180 (CA-01, CA-04, CA-05, CA-06)', async () => {
    ({ app, sources } = await createApp());

    const res = await download('visit-tracking/export', UserRole.Director).expect(200);
    const body = res.body as Buffer;

    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="seguimiento-visitas-${businessToday()}.csv"`,
    );
    expect(res.headers['cache-control']).toBe('no-store');
    expect(body.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(body.subarray(3).toString('utf8')).toBe(
      'Fecha,Cliente,Municipio,Tipo,Potencial,Estado visita,Cotización,Resultado\r\n' +
        '2026-10-26,"Ferretería ""El Tornillo"", S.A.S",Barranquilla,Retail,Alto,Visitado,1500000.5,Interesado\r\n' +
        '2026-10-20,Ñandú Ltda,,,,Pendiente,,\r\n',
    );
  });

  it('passes the table filters to the query (CA-02)', async () => {
    ({ app, sources } = await createApp());

    await download(
      'visit-tracking/export?week=2026-10-22&zoneId=2&advisorId=3&status=visited',
      UserRole.Admin,
    ).expect(200);

    expect(sources.visitFilters[0]).toEqual({
      from: new Date('2026-10-19T05:00:00.000Z'),
      to: new Date('2026-10-26T05:00:00.000Z'),
      zoneId: 2,
      advisorId: 3,
      status: 'visited',
    });
  });

  it('exports only the advisor own visits, ignoring advisorId (CA-03)', async () => {
    ({ app, sources } = await createApp());

    await download('visit-tracking/export?advisorId=3', UserRole.Advisor).expect(200);

    expect(sources.visitFilters[0]).toMatchObject({ advisorUserId: 'usr_advisor' });
    expect(sources.visitFilters[0]).not.toHaveProperty('advisorId');
  });

  it.each([
    ['week with a range', 'visit-tracking/export?week=2026-10-22&fromDate=2026-10-01'],
    ['fromDate after toDate', 'visit-tracking/export?fromDate=2026-10-31&toDate=2026-10-01'],
    ['an impossible date', 'visit-tracking/export?toDate=2026-02-30'],
    ['a malformed date', 'visit-tracking/export?week=22-10-2026'],
    ['an unknown status', 'visit-tracking/export?status=done'],
    ['a non-numeric zone', 'visit-tracking/export?zoneId=north'],
    ['pagination params', 'visit-tracking/export?page=2'],
    ['an unknown quote status', 'quotes/export?status=paid'],
    ['an impossible order date', 'sales-orders/export?fromDate=2026-02-30'],
  ])('rejects %s with a 400 JSON error, not a CSV', async (_, path) => {
    ({ app, sources } = await createApp());

    const res = await request(app.getHttpServer())
      .get(`/api/reports/${path}`)
      .set('Authorization', 'Bearer token_admin')
      .expect(400);

    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(sources.visitFilters).toHaveLength(0);
    expect(sources.documentFilters).toHaveLength(0);
  });

  it('answers a failing query with a 500 JSON error instead of a broken 200 file', async () => {
    ({ app, sources } = await createApp());
    sources.fail = true;

    const res = await request(app.getHttpServer())
      .get('/api/reports/visit-tracking/export')
      .set('Authorization', 'Bearer token_admin')
      .expect(500);

    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['content-disposition']).toBeUndefined();
  });

  it('downloads the quotes CSV, limited to the advisor clients (CA-03)', async () => {
    ({ app, sources } = await createApp());

    const res = await download('quotes/export?status=sent', UserRole.Advisor).expect(200);

    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="cotizaciones-${businessToday()}.csv"`,
    );
    expect((res.body as Buffer).subarray(3).toString('utf8')).toBe(
      'Número,Fecha,Cliente,NIT,Asesor,Estado,Valor,Moneda\r\n' +
        'COT-0001,2026-10-20,Acme,900123456-5,Asesor Uno,Enviada,250000,COP\r\n',
    );
    expect(sources.documentFilters[0]).toEqual({ status: 'sent', clientIds: [10] });
  });

  it('downloads the sales orders CSV', async () => {
    ({ app, sources } = await createApp());

    const res = await download('sales-orders/export', UserRole.Admin).expect(200);

    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="pedidos-${businessToday()}.csv"`,
    );
    expect((res.body as Buffer).subarray(3).toString('utf8')).toBe(
      'Número,Fecha,Cliente,NIT,Asesor,Cotización,Estado,Valor,Entrega estimada\r\n' +
        'PED-0001,2026-10-21,Acme,900123456-5,Asesor Uno,,Pendiente,99.9,2026-10-28\r\n',
    );
    expect(sources.documentFilters[0]).toEqual({ clientIds: undefined });
  });

  it('documents the three exports in Swagger as text/csv (CA-08)', async () => {
    ({ app, sources } = await createApp());

    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    for (const path of ['visit-tracking', 'quotes', 'sales-orders']) {
      const operation = res.body.paths[`/api/reports/${path}/export`]?.get;
      expect(operation, path).toBeDefined();
      expect(Object.keys(operation.responses)).toEqual(
        expect.arrayContaining(['200', '400', '401', '403']),
      );
      expect(operation.responses['200'].content).toHaveProperty('text/csv');
    }
    const params = res.body.paths['/api/reports/visit-tracking/export'].get.parameters.map(
      (p: { name: string }) => p.name,
    );
    expect(params).toEqual(
      expect.arrayContaining(['week', 'fromDate', 'toDate', 'zoneId', 'advisorId', 'status']),
    );
  });
});
