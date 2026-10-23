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
  ACTIVITY_LOG,
  type ActivityLogEntry,
  type ActivityLogPort,
} from '../src/shared/application/ports/activity-log.port.js';
import {
  ACTIVITY_LOG_REPOSITORY,
  type ActivityLogRepository,
} from '../src/modules/activity-log/domain/ports/activity-log.repository.js';
import { ActivityLogRecord } from '../src/modules/activity-log/domain/entities/activity-log-record.js';
import { GetClientActivityUseCase } from '../src/modules/activity-log/application/use-cases/get-client-activity.use-case.js';
import { ClientActivityController } from '../src/modules/activity-log/presentation/client-activity.controller.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../src/modules/clients/domain/repositories/client.repository.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../src/modules/clients/application/ports/advisor-client-access.port.js';
import {
  businessDateTimeToInstant,
  businessToday,
} from '../src/shared/domain/time/business-time.js';
import {
  CATALOG_LOOKUP,
  type CatalogLookupPort,
  type CatalogName,
} from '../src/modules/catalogs/application/ports/catalog-lookup.port.js';
import {
  FOLLOW_UP_CREATOR,
  type NextFollowUpInput,
} from '../src/modules/visits/application/ports/follow-up-creator.port.js';
import { FollowUp } from '../src/modules/follow-ups/domain/entities/follow-up.js';

import { CancelVisitUseCase } from '../src/modules/visits/application/cancel-visit.use-case.js';
import { GenerateRouteVisitsUseCase } from '../src/modules/visits/application/generate-route-visits.use-case.js';
import { GetVisitAgendaUseCase } from '../src/modules/visits/application/get-visit-agenda.use-case.js';
import { GetVisitFormUseCase } from '../src/modules/visits/application/get-visit-form.use-case.js';
import { GetVisitUseCase } from '../src/modules/visits/application/get-visit.use-case.js';
import { ListVisitsUseCase } from '../src/modules/visits/application/list-visits.use-case.js';
import {
  VISIT_REFERENCES,
  type AdvisorDetails,
  type AdvisorReference,
  type ClientDetails,
  type ClientReference,
  type PrimaryContactReference,
  type RouteClientReference,
  type RouteNameReference,
  type RouteReference,
  type VisitReferencesPort,
  type ZoneReference,
} from '../src/modules/visits/application/ports/visit-references.port.js';
import { RecordVisitOutcomeUseCase } from '../src/modules/visits/application/record-visit-outcome.use-case.js';
import { RescheduleVisitUseCase } from '../src/modules/visits/application/reschedule-visit.use-case.js';
import { ScheduleVisitUseCase } from '../src/modules/visits/application/schedule-visit.use-case.js';
import { StartVisitUseCase } from '../src/modules/visits/application/start-visit.use-case.js';
import { VisitAgendaEntry } from '../src/modules/visits/domain/visit-agenda-entry.js';
import { VisitOutcome } from '../src/modules/visits/domain/visit-outcome.js';
import { VisitStatus } from '../src/modules/visits/domain/visit-status.js';
import { Visit } from '../src/modules/visits/domain/visit.js';
import {
  VISIT_REPOSITORY,
  type VisitFilterOptions,
  type VisitRepository,
} from '../src/modules/visits/domain/visit.repository.js';
import { RouteVisitsController } from '../src/modules/visits/presentation/route-visits.controller.js';
import { VisitsController } from '../src/modules/visits/presentation/visits.controller.js';

const CHECKIN_RADIUS_METERS = 15;

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

  async signOut(): Promise<void> {}

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

/** Advisor fixtures: advisor.id -> betterAuth user id, status and name. */
const ADVISORS = new Map<
  number,
  AdvisorReference & AdvisorDetails & { userId: string }
>([
  [1, { id: 1, userId: advisorUser.id, active: true, name: 'Asesor Uno' }],
  [2, { id: 2, userId: 'usr_advisor_2', active: true, name: 'Asesor Dos' }],
  [3, { id: 3, userId: 'usr_advisor_3', active: false, name: 'Asesor Tres' }],
]);

/** Client fixtures, with the zone used by the zoneId filter. */
const CLIENTS = new Map<number, ClientReference & { zoneId: number }>([
  [1, { id: 1, active: true, zoneId: 1 }],
  [2, { id: 2, active: true, zoneId: 1 }],
  [3, { id: 3, active: false, zoneId: 2 }],
]);

/** Client 1 is at a known point (used by the check-in distance); client 2 has no coordinates. */
const CLIENT_DETAILS = new Map<number, ClientDetails>([
  [
    1,
    {
      id: 1,
      businessName: 'Client 1',
      tradeName: 'Trade 1',
      address: 'Address 1',
      latitude: 4.711,
      longitude: -74.0721,
      zoneId: 1,
    },
  ],
  [
    2,
    {
      id: 2,
      businessName: 'Client 2',
      tradeName: null,
      address: 'Address 2',
      latitude: null,
      longitude: null,
      zoneId: 1,
    },
  ],
  [
    3,
    {
      id: 3,
      businessName: 'Client 3',
      tradeName: null,
      address: 'Address 3',
      latitude: null,
      longitude: null,
      zoneId: 2,
    },
  ],
]);

const ZONES = new Map<number, ZoneReference>([[1, { id: 1, name: 'Norte' }]]);

/** Primary active contact, per client; absent clients have none. */
const CONTACTS = new Map<number, PrimaryContactReference>([
  [
    1,
    {
      name: 'Maria Rodriguez',
      phone: '6011111',
      mobile: '3001111111',
      email: 'maria@cliente1.co',
    },
  ],
]);

/** client_potential catalog entry, per client. */
const POTENTIALS = new Map<number, { id: number; name: string }>([
  [1, { id: 1, name: 'Alto' }],
]);

/** visit_objective, visit_type and visit_result catalog entries. id 9 is inactive in each. */
const CATALOG_ENTRIES: Record<CatalogName, Set<number>> = {
  zone: new Set(),
  client_type: new Set(),
  client_potential: new Set(),
  client_status: new Set(),
  visit_result: new Set([1]),
  visit_objective: new Set([1]),
  visit_type: new Set([1]),
  portfolio: new Set(),
};

function fakeCatalogs(): CatalogLookupPort {
  return {
    isActive: async (catalog, id) => CATALOG_ENTRIES[catalog].has(id),
  };
}

interface RouteFixture extends RouteReference, RouteNameReference {
  clients: RouteClientReference[];
}

/** Route fixtures. Route 10 belongs to the session advisor, 11 is inactive,
 * 12 belongs to the inactive advisor, 13 has no suggestedStartTime and a
 * mix of active/inactive clients. */
const ROUTES = new Map<number, RouteFixture>([
  [
    10,
    {
      id: 10,
      name: 'Route 10',
      advisorId: 1,
      active: true,
      suggestedStartTime: '08:00',
      clients: [
        { clientId: 1, visitOrder: 1, clientActive: true },
        { clientId: 2, visitOrder: 2, clientActive: true },
      ],
    },
  ],
  [
    11,
    {
      id: 11,
      name: 'Route 11',
      advisorId: 1,
      active: false,
      suggestedStartTime: '08:00',
      clients: [{ clientId: 1, visitOrder: 1, clientActive: true }],
    },
  ],
  [
    12,
    {
      id: 12,
      name: 'Route 12',
      advisorId: 3,
      active: true,
      suggestedStartTime: '08:00',
      clients: [{ clientId: 1, visitOrder: 1, clientActive: true }],
    },
  ],
  [
    13,
    {
      id: 13,
      name: 'Route 13',
      advisorId: 1,
      active: true,
      suggestedStartTime: null,
      clients: [
        { clientId: 1, visitOrder: 1, clientActive: true },
        { clientId: 3, visitOrder: 2, clientActive: false },
      ],
    },
  ],
]);

function fakeReferences(): VisitReferencesPort {
  return {
    findClient: async (clientId) => CLIENTS.get(clientId) ?? null,
    findAdvisor: async (advisorId) => ADVISORS.get(advisorId) ?? null,
    findRoute: async (routeId) => ROUTES.get(routeId) ?? null,
    isClientOnRoute: async (routeId, clientId) =>
      ROUTES.get(routeId)?.clients.some((c) => c.clientId === clientId) ??
      false,
    findRouteClients: async (routeId) => ROUTES.get(routeId)?.clients ?? [],
    findClientDetails: async (clientId) => CLIENT_DETAILS.get(clientId) ?? null,
    findZone: async (zoneId) => ZONES.get(zoneId) ?? null,
    findRouteName: async (routeId) => {
      const route = ROUTES.get(routeId);
      return route ? { id: route.id, name: route.name } : null;
    },
    findAdvisorDetails: async (advisorId) => {
      const advisor = ADVISORS.get(advisorId);
      return advisor ? { id: advisor.id, name: advisor.name } : null;
    },
    findPrimaryContact: async (clientId) => CONTACTS.get(clientId) ?? null,
  };
}

class InMemoryVisitRepository implements VisitRepository {
  private readonly visits = new Map<number, Visit>();
  private readonly outcomes = new Map<number, VisitOutcome>();
  private nextId = 1;
  private nextOutcomeId = 1;

  async findById(id: number): Promise<Visit | null> {
    const visit = this.visits.get(id);
    // A fresh copy, like a real repository returns from a query: the use
    // case can mutate it in place without also mutating what is stored.
    return visit ? new Visit({ ...visit }) : null;
  }

  async isAssignedToAdvisorUser(
    visitId: number,
    userId: string,
  ): Promise<boolean> {
    const visit = this.visits.get(visitId);
    return !!visit && ADVISORS.get(visit.advisorId)?.userId === userId;
  }

  async findPage(
    filter: VisitFilterOptions,
    page: { page: number; limit: number },
  ) {
    const all = [...this.visits.values()].filter((visit) => {
      if (
        filter.scheduledWithin &&
        (visit.scheduledDate < filter.scheduledWithin.start ||
          visit.scheduledDate >= filter.scheduledWithin.end)
      ) {
        return false;
      }
      if (filter.advisorId !== undefined && visit.advisorId !== filter.advisorId) {
        return false;
      }
      if (
        filter.advisorUserId !== undefined &&
        ADVISORS.get(visit.advisorId)?.userId !== filter.advisorUserId
      ) {
        return false;
      }
      if (
        filter.zoneId !== undefined &&
        CLIENTS.get(visit.clientId)?.zoneId !== filter.zoneId
      ) {
        return false;
      }
      if (filter.status !== undefined && visit.status !== filter.status) {
        return false;
      }
      return true;
    });
    all.sort((a, b) => {
      const byDate = a.scheduledDate.getTime() - b.scheduledDate.getTime();
      if (byDate !== 0) return byDate;
      return (a.visitOrder ?? 0) - (b.visitOrder ?? 0);
    });
    const start = (page.page - 1) * page.limit;
    return { items: all.slice(start, start + page.limit), total: all.length };
  }

  async findAgenda(
    userId: string,
    range: { start: Date; end: Date },
  ): Promise<VisitAgendaEntry[]> {
    const advisorId = [...ADVISORS.values()].find((a) => a.userId === userId)?.id;
    return [...this.visits.values()]
      .filter(
        (visit) =>
          visit.advisorId === advisorId &&
          visit.scheduledDate >= range.start &&
          visit.scheduledDate < range.end,
      )
      .sort((a, b) => {
        const byDate = a.scheduledDate.getTime() - b.scheduledDate.getTime();
        if (byDate !== 0) return byDate;
        return (a.visitOrder ?? 0) - (b.visitOrder ?? 0);
      })
      .map((visit) => {
        const client = CLIENTS.get(visit.clientId)!;
        const contact = CONTACTS.get(visit.clientId) ?? null;
        const potential = POTENTIALS.get(visit.clientId) ?? null;
        return {
          id: visit.id!,
          routeId: visit.routeId,
          scheduledDate: visit.scheduledDate,
          visitOrder: visit.visitOrder,
          actualDate: visit.actualDate,
          status: visit.status,
          client: {
            id: client.id,
            businessName: `Client ${client.id}`,
            address: `Address ${client.id}`,
          },
          primaryContact: contact,
          potential,
        };
      });
  }

  async findClientIdsWithScheduledVisit(
    clientIds: number[],
    range: { start: Date; end: Date },
  ): Promise<number[]> {
    return [...this.visits.values()]
      .filter(
        (visit) =>
          clientIds.includes(visit.clientId) &&
          visit.status === VisitStatus.Scheduled &&
          visit.scheduledDate >= range.start &&
          visit.scheduledDate < range.end,
      )
      .map((visit) => visit.clientId);
  }

  async save(visit: Visit): Promise<Visit> {
    const saved = new Visit({ ...visit, id: this.nextId++ });
    this.visits.set(saved.id!, saved);
    return saved;
  }

  async saveAll(visits: Visit[]): Promise<Visit[]> {
    return Promise.all(visits.map((visit) => this.save(visit)));
  }

  async updateIfStatus(
    visit: Visit,
    expected: VisitStatus,
  ): Promise<Visit | null> {
    const current = this.visits.get(visit.id!);
    if (!current || current.status !== expected) return null;
    this.visits.set(visit.id!, visit);
    return visit;
  }

  async recordOutcome(
    visit: Visit,
    outcome: VisitOutcome,
    expected: VisitStatus,
  ): Promise<{ visit: Visit; outcome: VisitOutcome } | null> {
    const current = this.visits.get(visit.id!);
    if (!current || current.status !== expected) return null;
    if (this.outcomes.has(visit.id!)) return null;
    this.visits.set(visit.id!, visit);
    const savedOutcome = new VisitOutcome({
      ...outcome,
      id: this.nextOutcomeId++,
      createdAt: new Date(),
    });
    this.outcomes.set(visit.id!, savedOutcome);
    return { visit, outcome: savedOutcome };
  }

  /** Test helper: seeds a visit directly, bypassing the use cases. */
  seed(props: {
    clientId: number;
    advisorId: number;
    routeId?: number | null;
    scheduledDate: Date;
    visitOrder?: number | null;
    status?: VisitStatus;
    startedAt?: Date | null;
  }): Visit {
    const visit = new Visit({
      id: this.nextId++,
      clientId: props.clientId,
      advisorId: props.advisorId,
      routeId: props.routeId ?? null,
      scheduledDate: props.scheduledDate,
      visitOrder: props.visitOrder ?? null,
      actualDate: null,
      status: props.status ?? VisitStatus.Scheduled,
      startedAt: props.startedAt ?? null,
      finishedAt: null,
      checkInLatitude: null,
      checkInLongitude: null,
      checkInDistanceMeters: null,
      locationConfirmed: false,
      visitObjectiveId: null,
      visitTypeId: null,
      interestLevel: null,
      interestReason: null,
      competitorMentioned: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.visits.set(visit.id!, visit);
    return visit;
  }
}

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

interface TestContext {
  app: INestApplication<App>;
  visits: InMemoryVisitRepository;
  followUpCreator: { create: ReturnType<typeof vi.fn> };
  /** A visit already scheduled for the session advisor (advisor 1), tomorrow. */
  ownVisit: Visit;
  /** A visit of another advisor (advisor 2). */
  otherVisit: Visit;
  /** A visit of the session advisor (advisor 1) scheduled for today, for HU-09. */
  todayVisit: Visit;
  activityEntries: ActivityLogEntry[];
}

// A fixed instant far in the future, so the suite never depends on "today".
const TOMORROW = businessDateTimeToInstant('2099-01-02', '09:00');
const YESTERDAY = businessDateTimeToInstant('2099-01-01', '09:00');
// HU-09 only allows /start and /outcome the day the visit is due, in business
// time, so that visit has to be scheduled for the real "today".
const TODAY = businessDateTimeToInstant(businessToday(), '09:00');

async function createTestApp(): Promise<TestContext> {
  const visits = new InMemoryVisitRepository();
  const ownVisit = visits.seed({
    clientId: 1,
    advisorId: 1,
    scheduledDate: TOMORROW,
  });
  const otherVisit = visits.seed({
    clientId: 2,
    advisorId: 2,
    scheduledDate: TOMORROW,
  });
  const todayVisit = visits.seed({
    clientId: 1,
    advisorId: 1,
    scheduledDate: TODAY,
  });

  const references = fakeReferences();
  const catalogs = fakeCatalogs();
  const activityEntries: ActivityLogEntry[] = [];
  let nextActivityId = 1;
  const activityLog: ActivityLogPort = {
    record: async (entry) => {
      activityEntries.push(entry);
    },
  };
  const activityLogRepository: ActivityLogRepository = {
    findPageByClient: async (clientId, filter, page) => {
      const records = activityEntries
        .filter((entry) => entry.clientId === clientId)
        .filter((entry) => !filter.action || entry.action === filter.action)
        .map((entry) => new ActivityLogRecord({
          id: nextActivityId++,
          clientId: entry.clientId,
          action: entry.action,
          userId: entry.userId,
          userName: null,
          description: entry.description,
          createdAt: entry.occurredAt,
        }))
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
      const start = (page.page - 1) * page.limit;
      return { items: records.slice(start, start + page.limit), total: records.length };
    },
  };
  const clients: ClientRepository = {
    findAll: async () => [],
    findById: async (id) => id === 1 ? ({ id, active: true } as never) : null,
    findByNit: async () => null,
    save: async (client) => client,
    update: async () => { throw new Error('Not used by visits e2e'); },
  };
  const advisorAccess: AdvisorClientAccessPort = {
    canAccess: async () => true,
    getAccessibleClientIds: async () => [1, 2, 3],
  };
  // Real validation rules; only the write is faked.
  const followUpCreator = {
    validate: (input: NextFollowUpInput) =>
      FollowUp.assertSchedulable(input, businessToday()),
    create: vi.fn().mockResolvedValue(undefined),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        validate: validateEnv,
      }),
    ],
    controllers: [VisitsController, RouteVisitsController, ClientActivityController],
    providers: [
      {
        provide: AUTH_SERVICE_PORT,
        useValue: new InMemoryAuthService([
          adminUser,
          directorUser,
          advisorUser,
        ]),
      },
      { provide: VISIT_REPOSITORY, useValue: visits },
      { provide: VISIT_REFERENCES, useValue: references },
      { provide: CATALOG_LOOKUP, useValue: catalogs },
      { provide: ACTIVITY_LOG, useValue: activityLog },
      { provide: ACTIVITY_LOG_REPOSITORY, useValue: activityLogRepository },
      { provide: CLIENT_REPOSITORY, useValue: clients },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: advisorAccess },
      {
        provide: GetClientActivityUseCase,
        inject: [CLIENT_REPOSITORY, ADVISOR_CLIENT_ACCESS, ACTIVITY_LOG_REPOSITORY],
        useFactory: (clientRepo: ClientRepository, access: AdvisorClientAccessPort, repo: ActivityLogRepository) =>
          new GetClientActivityUseCase(clientRepo, access, repo),
      },
      { provide: FOLLOW_UP_CREATOR, useValue: followUpCreator },
      {
        provide: ScheduleVisitUseCase,
        inject: [VISIT_REPOSITORY, VISIT_REFERENCES, ACTIVITY_LOG],
        useFactory: (r: VisitRepository, p: VisitReferencesPort, log: ActivityLogPort) =>
          new ScheduleVisitUseCase(r, p, log),
      },
      {
        provide: GenerateRouteVisitsUseCase,
        inject: [VISIT_REPOSITORY, VISIT_REFERENCES, ACTIVITY_LOG],
        useFactory: (r: VisitRepository, p: VisitReferencesPort, log: ActivityLogPort) =>
          new GenerateRouteVisitsUseCase(r, p, log),
      },
      {
        provide: ListVisitsUseCase,
        inject: [VISIT_REPOSITORY],
        useFactory: (r: VisitRepository) => new ListVisitsUseCase(r),
      },
      {
        provide: GetVisitAgendaUseCase,
        inject: [VISIT_REPOSITORY],
        useFactory: (r: VisitRepository) => new GetVisitAgendaUseCase(r),
      },
      {
        provide: GetVisitUseCase,
        inject: [VISIT_REPOSITORY],
        useFactory: (r: VisitRepository) => new GetVisitUseCase(r),
      },
      {
        provide: RescheduleVisitUseCase,
        inject: [VISIT_REPOSITORY, ACTIVITY_LOG],
        useFactory: (r: VisitRepository, log: ActivityLogPort) => new RescheduleVisitUseCase(r, log),
      },
      {
        provide: CancelVisitUseCase,
        inject: [VISIT_REPOSITORY, ACTIVITY_LOG],
        useFactory: (r: VisitRepository, log: ActivityLogPort) => new CancelVisitUseCase(r, log),
      },
      {
        provide: GetVisitFormUseCase,
        inject: [VISIT_REPOSITORY, VISIT_REFERENCES],
        useFactory: (r: VisitRepository, p: VisitReferencesPort) =>
          new GetVisitFormUseCase(r, p),
      },
      {
        provide: StartVisitUseCase,
        inject: [VISIT_REPOSITORY, VISIT_REFERENCES],
        useFactory: (r: VisitRepository, p: VisitReferencesPort) =>
          new StartVisitUseCase(r, p, CHECKIN_RADIUS_METERS),
      },
      {
        provide: RecordVisitOutcomeUseCase,
        inject: [VISIT_REPOSITORY, CATALOG_LOOKUP, ACTIVITY_LOG],
        useFactory: (r: VisitRepository, c: CatalogLookupPort, log: ActivityLogPort) =>
          new RecordVisitOutcomeUseCase(r, c, log, followUpCreator),
      },
      AuthGuard,
      RolesGuard,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return {
    app,
    visits,
    followUpCreator,
    ownVisit,
    otherVisit,
    todayVisit,
    activityEntries,
  };
}

const validSchedule = {
  clientId: 1,
  advisorId: 1,
  scheduledDate: '2099-01-02T09:00:00-05:00',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Visit scheduling and agenda (HU-08) - e2e', () => {
  let context: TestContext;

  afterEach(async () => {
    if (context?.app) {
      await context.app.close();
    }
  });

  describe('Authentication', () => {
    it.each([
      ['get', '/api/visits'],
      ['post', '/api/visits'],
      ['get', '/api/visits/1'],
      ['get', '/api/visits/agenda'],
      ['patch', '/api/visits/1/reschedule'],
      ['patch', '/api/visits/1/cancel'],
      ['get', '/api/visits/1/form'],
      ['post', '/api/visits/1/start'],
      ['post', '/api/visits/1/outcome'],
      ['post', '/api/routes/10/visits'],
    ] as const)('rejects %s %s without a token with 401', async (method, url) => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        [method](url)
        .send({})
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });
  });

  describe('POST /api/visits', () => {
    it.each([
      ['admin', 'token_admin'],
      ['director', 'token_director'],
    ])('lets the %s schedule a visit', async (_role, token) => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', `Bearer ${token}`)
        .send(validSchedule)
        .expect(201);

      expect(response.body).toMatchObject({
        clientId: 1,
        advisorId: 1,
        routeId: null,
        status: 'scheduled',
      });
      expect(typeof response.body.id).toBe('number');
    });

    it('rejects an advisor with 403', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', 'Bearer token_advisor')
        .send(validSchedule)
        .expect(403);

      expect(response.body).toMatchObject({ statusCode: 403, error: 'Forbidden' });
    });

    it('rejects a past scheduledDate with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ ...validSchedule, scheduledDate: '2020-01-01T09:00:00-05:00' })
        .expect(400);
    });

    it.each([
      ['an inactive client', { clientId: 3 }],
      ['a client that does not exist', { clientId: 999 }],
      ['an inactive advisor', { advisorId: 3 }],
      ['an advisor that does not exist', { advisorId: 999 }],
    ])('rejects %s with 400', async (_case, override) => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ ...validSchedule, ...override })
        .expect(400);
    });

    it('rejects a client that is not on the given route with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ ...validSchedule, clientId: 2, routeId: 13 })
        .expect(400);
    });

    it('accepts a route whose client it belongs to', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ ...validSchedule, clientId: 1, routeId: 10 })
        .expect(201);

      expect(response.body).toMatchObject({ routeId: 10 });
    });
  });

  describe('POST /api/routes/:routeId/visits', () => {
    it.each([
      ['admin', 'token_admin'],
      ['director', 'token_director'],
    ])('lets the %s generate the visits of a route', async (_role, token) => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/routes/10/visits')
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2099-02-01' })
        .expect(201);

      expect(response.body.created).toHaveLength(2);
      expect(response.body.created[0]).toMatchObject({
        clientId: 1,
        advisorId: 1,
        routeId: 10,
        visitOrder: 1,
      });
      expect(response.body.skipped).toEqual([]);
    });

    it('rejects an advisor with 403', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/routes/10/visits')
        .set('Authorization', 'Bearer token_advisor')
        .send({ date: '2099-02-01' })
        .expect(403);
    });

    it('answers 404 for a route that does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/routes/999/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ date: '2099-02-01' })
        .expect(404);
    });

    it('rejects an inactive route with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/routes/11/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ date: '2099-02-01' })
        .expect(400);
    });

    it("rejects a route whose advisor is inactive with 400", async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/routes/12/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ date: '2099-02-01' })
        .expect(400);
    });

    it('uses the body time when the route has none, and rejects when neither is present', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/routes/13/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ date: '2099-02-01' })
        .expect(400);

      const response = await request(context.app.getHttpServer())
        .post('/api/routes/13/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ date: '2099-02-01', time: '10:00' })
        .expect(201);

      // Client 1 is active and created; client 3 is inactive and skipped.
      expect(response.body.created).toHaveLength(1);
      expect(response.body.created[0]).toMatchObject({ clientId: 1 });
      expect(response.body.skipped).toEqual([
        { clientId: 3, reason: 'inactive_client' },
      ]);
    });

    it('skips a client that already has a visit scheduled that day', async () => {
      context = await createTestApp();
      context.visits.seed({
        clientId: 2,
        advisorId: 1,
        scheduledDate: businessDateTimeToInstant('2099-03-01', '07:00'),
      });

      const response = await request(context.app.getHttpServer())
        .post('/api/routes/10/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ date: '2099-03-01' })
        .expect(201);

      expect(response.body.created).toHaveLength(1);
      expect(response.body.created[0]).toMatchObject({ clientId: 1 });
      expect(response.body.skipped).toEqual([
        { clientId: 2, reason: 'already_scheduled' },
      ]);
    });
  });

  describe('GET /api/visits', () => {
    it('lists every visit for an admin, paginated', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/visits')
        .query({ page: 1, limit: 1 })
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toMatchObject({ total: 3, page: 1, limit: 1 });
      expect(response.body.data).toHaveLength(1);
    });

    it('only lists the visits of the session advisor, ignoring advisorId', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/visits')
        .query({ advisorId: 2 })
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((v) => v.advisorId === 1)).toBe(true);
    });

    it('filters by zoneId', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/visits')
        .query({ zoneId: 1 })
        .set('Authorization', 'Bearer token_director')
        .expect(200);

      // All three seeded visits are for clients in zone 1.
      expect(response.body.total).toBe(3);
    });

    it('rejects sending date and week together with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/visits')
        .query({ date: '2099-01-02', week: '2099-01-02' })
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });

    it('rejects a limit above the maximum with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/visits')
        .query({ limit: 101 })
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });
  });

  describe('GET /api/visits/agenda', () => {
    it("returns the session advisor's visits for the day", async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/visits/agenda')
        .query({ date: '2099-01-02' })
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        client: { id: 1, businessName: 'Client 1' },
        primaryContact: {
          name: 'Maria Rodriguez',
          phone: '6011111',
        },
        potential: { id: 1, name: 'Alto' },
      });
    });

    it('returns null contact and potential when the client has none', async () => {
      context = await createTestApp();
      context.visits.seed({
        clientId: 2,
        advisorId: 1,
        scheduledDate: TOMORROW,
      });

      const response = await request(context.app.getHttpServer())
        .get('/api/visits/agenda')
        .query({ date: '2099-01-02' })
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      const entryForClient2 = response.body.find(
        (entry: { client: { id: number } }) => entry.client.id === 2,
      );
      expect(entryForClient2).toMatchObject({
        primaryContact: null,
        potential: null,
      });
    });

    it('returns the week when period=week', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/visits/agenda')
        .query({ period: 'week', date: '2099-01-02' })
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('rejects admin and director with 403', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/visits/agenda')
        .set('Authorization', 'Bearer token_admin')
        .expect(403);
    });
  });

  describe('GET /api/visits/:id', () => {
    it('returns any visit to the director', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get(`/api/visits/${context.otherVisit.id}`)
        .set('Authorization', 'Bearer token_director')
        .expect(200);
    });

    it('returns their own visit to an advisor', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get(`/api/visits/${context.ownVisit.id}`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body).toMatchObject({ advisorId: 1 });
    });

    it("answers 404 to an advisor for another advisor's visit", async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get(`/api/visits/${context.otherVisit.id}`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(404);

      expect(response.body).toMatchObject({ statusCode: 404, error: 'Not Found' });
    });

    it('answers 404 for a visit that does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/visits/999')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);
    });

    it('answers 400 for a non-numeric id', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/visits/abc')
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });
  });

  describe('PATCH /api/visits/:id/reschedule', () => {
    it('reschedules a scheduled visit', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/reschedule`)
        .set('Authorization', 'Bearer token_director')
        .send({ scheduledDate: '2099-01-10T09:00:00-05:00' })
        .expect(200);

      expect(new Date(response.body.scheduledDate)).toEqual(
        businessDateTimeToInstant('2099-01-10', '09:00'),
      );
    });

    it('rejects a past date with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/reschedule`)
        .set('Authorization', 'Bearer token_admin')
        .send({ scheduledDate: '2020-01-01T09:00:00-05:00' })
        .expect(400);
    });

    it('rejects a cancelled visit with 400', async () => {
      context = await createTestApp();
      await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/cancel`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/reschedule`)
        .set('Authorization', 'Bearer token_admin')
        .send({ scheduledDate: '2099-01-10T09:00:00-05:00' })
        .expect(400);
    });

    it('rejects an advisor with 403', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/reschedule`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ scheduledDate: '2099-01-10T09:00:00-05:00' })
        .expect(403);
    });

    it('answers 404 when the visit does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/visits/999/reschedule')
        .set('Authorization', 'Bearer token_admin')
        .send({ scheduledDate: '2099-01-10T09:00:00-05:00' })
        .expect(404);
    });
  });

  describe('PATCH /api/visits/:id/cancel', () => {
    it('cancels a scheduled visit', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/cancel`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toMatchObject({ status: 'cancelled' });
    });

    it('rejects cancelling an already cancelled visit with 400', async () => {
      context = await createTestApp();
      await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/cancel`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/cancel`)
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });

    it('rejects an advisor with 403', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch(`/api/visits/${context.ownVisit.id}/cancel`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(403);
    });
  });

  describe('GET /api/visits/:id/form (HU-09)', () => {
    it('returns the pre-filled form for the session advisor', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get(`/api/visits/${context.todayVisit.id}/form`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(response.body).toMatchObject({
        visit: {
          id: context.todayVisit.id,
          status: 'scheduled',
          startedAt: null,
          locationConfirmed: false,
        },
        client: {
          id: 1,
          businessName: 'Client 1',
          tradeName: 'Trade 1',
          address: 'Address 1',
          latitude: 4.711,
          longitude: -74.0721,
        },
        primaryContact: { name: 'Maria Rodriguez', phone: '6011111' },
        zone: { id: 1, name: 'Norte' },
        advisor: { id: 1, name: 'Asesor Uno' },
      });
      expect(response.body.route).toBeNull();
      expect(response.body.week).toMatchObject({
        date: businessToday(),
      });
      expect(typeof response.body.week.isoWeek).toBe('number');
      expect(typeof response.body.week.weekday).toBe('string');
    });

    it('rejects admin and director with 403', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get(`/api/visits/${context.todayVisit.id}/form`)
        .set('Authorization', 'Bearer token_admin')
        .expect(403);
    });

    it("answers 404 to an advisor for another advisor's visit", async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get(`/api/visits/${context.otherVisit.id}/form`)
        .set('Authorization', 'Bearer token_advisor')
        .expect(404);
    });
  });

  describe('POST /api/visits/:id/start (HU-09)', () => {
    it('confirms the location when inside the check-in radius', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/start`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ latitude: 4.711, longitude: -74.0721 })
        .expect(201);

      expect(response.body).toMatchObject({
        distance: 0,
        locationConfirmed: true,
        checkInRadiusMeters: CHECKIN_RADIUS_METERS,
      });
      expect(response.body.startedAt).not.toBeNull();
    });

    it('does not confirm the location when outside the check-in radius', async () => {
      context = await createTestApp();
      // About 1.1 km north of the client (far past the 15 m radius).
      const response = await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/start`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ latitude: 4.721, longitude: -74.0721 })
        .expect(201);

      expect(response.body.locationConfirmed).toBe(false);
      expect(response.body.distance).toBeGreaterThan(CHECKIN_RADIUS_METERS);
    });

    it('confirms nothing when no location is sent', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/start`)
        .set('Authorization', 'Bearer token_advisor')
        .send({})
        .expect(201);

      expect(response.body).toMatchObject({
        distance: null,
        locationConfirmed: false,
      });
    });

    it('rejects sending only one of latitude/longitude with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/start`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ latitude: 4.711 })
        .expect(400);
    });

    it('keeps startedAt from the first call when retried', async () => {
      context = await createTestApp();
      const server = context.app.getHttpServer();
      const url = `/api/visits/${context.todayVisit.id}/start`;

      const first = await request(server)
        .post(url)
        .set('Authorization', 'Bearer token_advisor')
        .send({ latitude: 4.711, longitude: -74.0721 })
        .expect(201);

      const second = await request(server)
        .post(url)
        .set('Authorization', 'Bearer token_advisor')
        .send({ latitude: 4.721, longitude: -74.0721 })
        .expect(201);

      expect(second.body.startedAt).toBe(first.body.startedAt);
      expect(second.body.locationConfirmed).toBe(false);
    });

    it('rejects a visit that is not due today with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.ownVisit.id}/start`)
        .set('Authorization', 'Bearer token_advisor')
        .send({})
        .expect(400);
    });

    it('rejects admin and director with 403', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/start`)
        .set('Authorization', 'Bearer token_admin')
        .send({})
        .expect(403);
    });

    it("answers 404 to an advisor for another advisor's visit", async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.otherVisit.id}/start`)
        .set('Authorization', 'Bearer token_advisor')
        .send({})
        .expect(404);
    });
  });

  describe('POST /api/visits/:id/outcome (HU-09)', () => {
    const validOutcome = {
      visitObjectiveId: 1,
      visitTypeId: 1,
      visitResultId: 1,
      interestLevel: 'high',
      observation: 'Interested in a bulk order next month',
    };

    it('shows scheduled and completed visit actions in the client activity endpoint', async () => {
      context = await createTestApp();
      const scheduledDate = new Date(Date.now() + 3 * 60_000).toISOString();
      const scheduled = await request(context.app.getHttpServer())
        .post('/api/visits')
        .set('Authorization', 'Bearer token_admin')
        .send({ ...validSchedule, scheduledDate })
        .expect(201);

      await request(context.app.getHttpServer())
        .post(`/api/visits/${scheduled.body.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send(validOutcome)
        .expect(201);

      const activity = await request(context.app.getHttpServer())
        .get('/api/clients/1/activity')
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);

      expect(activity.body.data.map((entry: { action: string }) => entry.action))
        .toEqual(['visit.completed', 'visit.scheduled']);
      expect(activity.body.data.every((entry: { clientId: number }) => entry.clientId === 1))
        .toBe(true);
      expect(activity.body.data.find((entry: { action: string }) => entry.action === 'visit.completed')?.user.id)
        .toBe(advisorUser.id);
    });

    it('records the outcome and marks the visit visited, even without /start', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send(validOutcome)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'visited',
        locationConfirmed: false,
        outcome: {
          visitResultId: 1,
          observation: 'Interested in a bulk order next month',
        },
      });
      expect(response.body.actualDate).not.toBeNull();
    });

    it('rejects a second outcome for the same visit with 400', async () => {
      context = await createTestApp();
      const url = `/api/visits/${context.todayVisit.id}/outcome`;

      await request(context.app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer token_advisor')
        .send(validOutcome)
        .expect(201);

      await request(context.app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer token_advisor')
        .send(validOutcome)
        .expect(400);
    });

    it.each([
      ['an inactive visit_objective', { visitObjectiveId: 9 }],
      ['an unknown visit_type', { visitTypeId: 999 }],
      ['an inactive visit_result', { visitResultId: 9 }],
    ])('rejects %s with 400', async (_case, override) => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ ...validOutcome, ...override })
        .expect(400);
    });

    it('rejects an empty observation with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ ...validOutcome, observation: '   ' })
        .expect(400);
    });

    it('rejects finishedAt before startedAt with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send({
          ...validOutcome,
          startedAt: TODAY.toISOString(),
          finishedAt: new Date(TODAY.getTime() - 60_000).toISOString(),
        })
        .expect(400);
    });

    it('rejects a visit that is not due today with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.ownVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send(validOutcome)
        .expect(400);
    });

    it('rejects admin and director with 403', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_admin')
        .send(validOutcome)
        .expect(403);
    });

    // HU-09 CA-09
    it('creates the next follow-up in the same request', async () => {
      context = await createTestApp();
      const nextFollowUp = {
        nextDate: businessToday(),
        nextTime: '15:30',
        activity: 'Send the quote',
      };

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ ...validOutcome, nextFollowUp })
        .expect(201);

      expect(context.followUpCreator.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: advisorUser.id }),
        context.todayVisit.id,
        expect.objectContaining(nextFollowUp),
      );
    });

    it('rejects a past follow-up date with 400 and leaves the visit scheduled', async () => {
      context = await createTestApp();
      const url = `/api/visits/${context.todayVisit.id}/outcome`;

      await request(context.app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer token_advisor')
        .send({
          ...validOutcome,
          nextFollowUp: { nextDate: '2020-01-01', activity: 'Call back' },
        })
        .expect(400);
      expect(context.activityEntries).toHaveLength(0);

      // Nothing was saved, so the visit can still be recorded.
      await request(context.app.getHttpServer())
        .post(url)
        .set('Authorization', 'Bearer token_advisor')
        .send(validOutcome)
        .expect(201);
    });

    it.each([
      ['without activity', { nextDate: '2099-01-01' }],
      ['with a malformed time', { nextDate: '2099-01-01', activity: 'X', nextTime: '25:00' }],
    ])('rejects a follow-up %s with 400', async (_case, nextFollowUp) => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.todayVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ ...validOutcome, nextFollowUp })
        .expect(400);
      expect(context.followUpCreator.create).not.toHaveBeenCalled();
    });

    it("answers 404 to an advisor for another advisor's visit", async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post(`/api/visits/${context.otherVisit.id}/outcome`)
        .set('Authorization', 'Bearer token_advisor')
        .send(validOutcome)
        .expect(404);
    });
  });

  describe('Swagger documentation', () => {
    it('documents the visits endpoints with bearer auth', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      const paths = response.body.paths;
      expect(paths).toHaveProperty('/api/visits');
      expect(paths).toHaveProperty('/api/visits/{id}');
      expect(paths).toHaveProperty('/api/visits/agenda');
      expect(paths).toHaveProperty('/api/visits/{id}/reschedule');
      expect(paths).toHaveProperty('/api/visits/{id}/cancel');
      expect(paths).toHaveProperty('/api/visits/{id}/form');
      expect(paths).toHaveProperty('/api/visits/{id}/start');
      expect(paths).toHaveProperty('/api/visits/{id}/outcome');
      expect(paths).toHaveProperty('/api/routes/{routeId}/visits');
      expect(paths['/api/visits'].post.tags).toContain('visits');
      expect(paths['/api/visits'].post.security).toBeDefined();
      expect(paths['/api/visits'].post.responses).toHaveProperty('403');
    });
  });
});
