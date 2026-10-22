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
  NotFoundError,
  UnauthorizedError,
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
import { ContactsController } from '../src/modules/contacts/presentation/contacts.controller.js';
import { CreateContactUseCase } from '../src/modules/contacts/application/use-cases/create-contact.use-case.js';
import { ListClientContactsUseCase } from '../src/modules/contacts/application/use-cases/list-client-contacts.use-case.js';
import { GetContactUseCase } from '../src/modules/contacts/application/use-cases/get-contact.use-case.js';
import { UpdateContactUseCase } from '../src/modules/contacts/application/use-cases/update-contact.use-case.js';
import { ChangeContactStatusUseCase } from '../src/modules/contacts/application/use-cases/change-contact-status.use-case.js';
import {
  CONTACT_REPOSITORY,
  type ContactRepository,
  type UpdateContactData,
} from '../src/modules/contacts/domain/repositories/contact.repository.js';
import {
  Contact,
} from '../src/modules/contacts/domain/entities/contact.js';

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

/** Client repository fake with the clients used by the contact tests. */
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
 * Contact repository fake that reproduces the rule of the real repository:
 * a client has at most one primary contact, so storing a contact as primary
 * demotes the previous primary one.
 */
class InMemoryContactRepository implements ContactRepository {
  private readonly rows = new Map<number, Contact>();
  private nextId = 1;

  async findByClient(clientId: number): Promise<Contact[]> {
    return [...this.rows.values()]
      .filter((contact) => contact.clientId === clientId)
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          a.name.localeCompare(b.name),
      );
  }

  async findById(id: number): Promise<Contact | null> {
    return this.rows.get(id) ?? null;
  }

  async findByIdForClient(
    clientId: number,
    id: number,
  ): Promise<Contact | null> {
    const contact = this.rows.get(id);
    if (!contact || contact.clientId !== clientId) return null;
    return contact;
  }

  async save(contact: Contact): Promise<Contact> {
    const id = this.nextId++;
    if (contact.isPrimary) {
      this.demote(contact.clientId, id);
    }
    const saved = new Contact({
      ...contact,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.rows.set(id, saved);
    return saved;
  }

  async update(id: number, data: UpdateContactData): Promise<Contact> {
    const existing = this.rows.get(id);
    if (!existing) {
      throw new NotFoundError(`Contact with id '${id}' not found`);
    }
    if (data.isPrimary === true) {
      this.demote(existing.clientId, id);
    }
    const updated = new Contact({
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.rows.set(id, updated);
    return updated;
  }

  /** Clears the primary flag of every contact of the client but the given one. */
  private demote(clientId: number, keepId: number): void {
    for (const [id, contact] of this.rows) {
      if (contact.clientId === clientId && id !== keepId && contact.isPrimary) {
        this.rows.set(
          id,
          new Contact({ ...contact, isPrimary: false, updatedAt: new Date() }),
        );
      }
    }
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

/** Records every entry written by the contact use cases. */
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
  contacts: InMemoryContactRepository;
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
  const clients = new InMemoryClientRepository();
  const contacts = new InMemoryContactRepository();
  const access = new InMemoryAdvisorAccess();
  const activityLog = new InMemoryActivityLog();

  const routedClient = clients.seed(
    emptyClientProps({
      nit: '900123456-5',
      businessName: 'Distribuidora Andina SAS',
      zoneId: 1,
      phone: '6015551234',
    }),
  );
  // Second client: it exists but it is not on the advisor's routes.
  clients.seed(
    emptyClientProps({
      nit: '800123456-7',
      businessName: 'Comercializadora Norte Ltda',
      zoneId: 2,
      active: false,
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
    controllers: [ContactsController],
    providers: [
      {
        provide: AUTH_SERVICE_PORT,
        useValue: new InMemoryAuthService([
          adminUser,
          directorUser,
          advisorUser,
        ]),
      },
      { provide: CLIENT_REPOSITORY, useValue: clients },
      { provide: CONTACT_REPOSITORY, useValue: contacts },
      { provide: ADVISOR_CLIENT_ACCESS, useValue: access },
      { provide: ACTIVITY_LOG, useValue: activityLog },
      {
        provide: CreateContactUseCase,
        inject: [
          CLIENT_REPOSITORY,
          CONTACT_REPOSITORY,
          ADVISOR_CLIENT_ACCESS,
          ACTIVITY_LOG,
        ],
        useFactory: (
          c: ClientRepository,
          ct: ContactRepository,
          a: AdvisorClientAccessPort,
          l: ActivityLogPort,
        ) => new CreateContactUseCase(c, ct, a, l),
      },
      {
        provide: ListClientContactsUseCase,
        inject: [CLIENT_REPOSITORY, CONTACT_REPOSITORY, ADVISOR_CLIENT_ACCESS],
        useFactory: (
          c: ClientRepository,
          ct: ContactRepository,
          a: AdvisorClientAccessPort,
        ) => new ListClientContactsUseCase(c, ct, a),
      },
      {
        provide: GetContactUseCase,
        inject: [CLIENT_REPOSITORY, CONTACT_REPOSITORY, ADVISOR_CLIENT_ACCESS],
        useFactory: (
          c: ClientRepository,
          ct: ContactRepository,
          a: AdvisorClientAccessPort,
        ) => new GetContactUseCase(c, ct, a),
      },
      {
        provide: UpdateContactUseCase,
        inject: [
          CLIENT_REPOSITORY,
          CONTACT_REPOSITORY,
          ADVISOR_CLIENT_ACCESS,
          ACTIVITY_LOG,
        ],
        useFactory: (
          c: ClientRepository,
          ct: ContactRepository,
          a: AdvisorClientAccessPort,
          l: ActivityLogPort,
        ) => new UpdateContactUseCase(c, ct, a, l),
      },
      {
        provide: ChangeContactStatusUseCase,
        inject: [
          CLIENT_REPOSITORY,
          CONTACT_REPOSITORY,
          ADVISOR_CLIENT_ACCESS,
          ACTIVITY_LOG,
        ],
        useFactory: (
          c: ClientRepository,
          ct: ContactRepository,
          a: AdvisorClientAccessPort,
          l: ActivityLogPort,
        ) => new ChangeContactStatusUseCase(c, ct, a, l),
      },
      AuthGuard,
      RolesGuard,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  return { app, clients, contacts, access, activityLog };
}

/** Registers a contact of the first client and returns its id. */
async function createContact(
  context: TestContext,
  body: Record<string, unknown> = {},
): Promise<number> {
  const response = await request(context.app.getHttpServer())
    .post('/api/clients/1/contacts')
    .set('Authorization', 'Bearer token_admin')
    .send({
      name: 'María Fernanda Gómez',
      jobTitle: 'Gerente de Compras',
      phone: '6015551234',
      mobile: '3105551234',
      email: 'compras@distribuidoraandina.co',
      ...body,
    })
    .expect(201);

  return response.body.id as number;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Client contacts (HU-04) - e2e', () => {
  let context: TestContext;

  afterEach(async () => {
    if (context?.app) {
      await context.app.close();
    }
  });

  describe('POST /api/clients/:clientId/contacts', () => {
    it('creates a valid contact and registers the activity log', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_admin')
        .send({
          name: 'María Fernanda Gómez',
          jobTitle: 'Gerente de Compras',
          phone: '6015551234',
          mobile: '3105551234',
          email: 'compras@distribuidoraandina.co',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        clientId: 1,
        name: 'María Fernanda Gómez',
        jobTitle: 'Gerente de Compras',
        phone: '6015551234',
        mobile: '3105551234',
        email: 'compras@distribuidoraandina.co',
        isPrimary: false,
        active: true,
      });
      expect(typeof response.body.id).toBe('number');

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'contact.created',
      );
      expect(entry).toBeDefined();
      expect(entry?.userId).toBe(adminUser.id);
      expect(entry?.clientId).toBe(1);
    });

    it('allows the director to create contacts', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_director')
        .send({ name: 'Carlos Ramírez' })
        .expect(201);
    });

    it('rejects a contact without name with 400', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_admin')
        .send({ jobTitle: 'Gerente de Compras' })
        .expect(400);

      expect(response.body).toMatchObject({ statusCode: 400 });
      expect(context.activityLog.entries).toHaveLength(0);
    });

    it('rejects an invalid email or phone with 400', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'María', email: 'not-an-email' })
        .expect(400);

      await request(context.app.getHttpServer())
        .post('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'María', phone: 'abc' })
        .expect(400);
    });

    it('rejects a client that does not exist with 404', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients/999/contacts')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'María Fernanda Gómez' })
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
      expect(context.activityLog.entries).toHaveLength(0);
    });

    it('rejects an advisor with 403 Forbidden', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .post('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_advisor')
        .send({ name: 'María Fernanda Gómez' })
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .post('/api/clients/1/contacts')
        .send({ name: 'María Fernanda Gómez' })
        .expect(401);
    });
  });

  describe('GET /api/clients/:clientId/contacts', () => {
    it('lists the contacts of the client', async () => {
      context = await createTestApp();
      await createContact(context);

      const response = await request(context.app.getHttpServer())
        .get('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        clientId: 1,
        name: 'María Fernanda Gómez',
      });
    });

    it('does not mix the contacts of another client', async () => {
      context = await createTestApp();
      await createContact(context);

      await request(context.app.getHttpServer())
        .post('/api/clients/2/contacts')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'Pedro Torres' })
        .expect(201);

      const first = await request(context.app.getHttpServer())
        .get('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(first.body).toHaveLength(1);
      expect(first.body[0].name).toBe('María Fernanda Gómez');
    });

    it('answers 404 for a client that does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/clients/999/contacts')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);
    });

    it('answers 404 to an advisor for a client outside their routes', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/clients/2/contacts')
        .set('Authorization', 'Bearer token_advisor')
        .expect(404);
    });

    it('lets an advisor read the contacts of a client on their routes', async () => {
      context = await createTestApp();
      await createContact(context);

      await request(context.app.getHttpServer())
        .get('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_advisor')
        .expect(200);
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/clients/1/contacts')
        .expect(401);
    });
  });

  describe('GET /api/clients/:clientId/contacts/:id', () => {
    it('returns an existing contact', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      const response = await request(context.app.getHttpServer())
        .get(`/api/clients/1/contacts/${id}`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body).toMatchObject({
        id,
        clientId: 1,
        name: 'María Fernanda Gómez',
      });
    });

    it('answers 404 for a contact that does not exist', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/clients/1/contacts/999')
        .set('Authorization', 'Bearer token_admin')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });

    it('answers 404 for a contact of another client', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      // The contact exists, but it does not belong to the client of the route.
      await request(context.app.getHttpServer())
        .get(`/api/clients/2/contacts/${id}`)
        .set('Authorization', 'Bearer token_admin')
        .expect(404);
    });

    it('answers 400 for a non-numeric id', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .get('/api/clients/1/contacts/abc')
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });
  });

  describe('PATCH /api/clients/:clientId/contacts/:id', () => {
    it('updates the allowed fields and registers the activity log', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      const response = await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}`)
        .set('Authorization', 'Bearer token_admin')
        .send({
          name: 'María Fernanda Gómez Ruiz',
          jobTitle: 'Directora de Compras',
          phone: '6019998888',
          email: 'compras.nuevo@distribuidoraandina.co',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id,
        name: 'María Fernanda Gómez Ruiz',
        jobTitle: 'Directora de Compras',
        phone: '6019998888',
        email: 'compras.nuevo@distribuidoraandina.co',
        clientId: 1,
      });

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'contact.updated',
      );
      expect(entry).toBeDefined();
      expect(entry?.clientId).toBe(1);
    });

    it('rejects an unknown field with 400', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}`)
        .set('Authorization', 'Bearer token_admin')
        .send({ clientId: 2 })
        .expect(400);
    });

    it('answers 404 when the contact does not belong to the client', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/2/contacts/${id}`)
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'Otro contacto' })
        .expect(404);
    });

    it('answers 404 when the contact does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/clients/1/contacts/999')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'Otro contacto' })
        .expect(404);
    });

    it('rejects an advisor with 403 Forbidden', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ name: 'Otro contacto' })
        .expect(403);
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}`)
        .send({ name: 'Otro contacto' })
        .expect(401);
    });
  });

  describe('PATCH /api/clients/:clientId/contacts/:id/status', () => {
    it('deactivates a contact preserving its data', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      const response = await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}/status`)
        .set('Authorization', 'Bearer token_admin')
        .send({ active: false })
        .expect(200);

      expect(response.body).toMatchObject({
        id,
        active: false,
        name: 'María Fernanda Gómez',
        email: 'compras@distribuidoraandina.co',
      });

      // The contact is never deleted: it is still readable.
      const fetched = await request(context.app.getHttpServer())
        .get(`/api/clients/1/contacts/${id}`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(fetched.body.active).toBe(false);

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'contact.status_changed',
      );
      expect(entry).toBeDefined();
      expect(entry?.description).toContain('deactivated');
    });

    it('reactivates a deactivated contact', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}/status`)
        .set('Authorization', 'Bearer token_admin')
        .send({ active: false })
        .expect(200);

      const response = await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}/status`)
        .set('Authorization', 'Bearer token_admin')
        .send({ active: true })
        .expect(200);

      expect(response.body.active).toBe(true);
    });

    it('clears the primary flag when the primary contact is deactivated', async () => {
      context = await createTestApp();
      const id = await createContact(context, { isPrimary: true });

      const response = await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}/status`)
        .set('Authorization', 'Bearer token_admin')
        .send({ active: false })
        .expect(200);

      expect(response.body).toMatchObject({
        id,
        active: false,
        isPrimary: false,
      });

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'contact.primary_changed',
      );
      expect(entry).toBeDefined();
    });

    it('rejects a missing active flag with 400', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}/status`)
        .set('Authorization', 'Bearer token_admin')
        .send({})
        .expect(400);
    });

    it('answers 404 when the contact does not exist', async () => {
      context = await createTestApp();

      await request(context.app.getHttpServer())
        .patch('/api/clients/1/contacts/999/status')
        .set('Authorization', 'Bearer token_admin')
        .send({ active: false })
        .expect(404);
    });

    it('rejects an advisor with 403 Forbidden', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}/status`)
        .set('Authorization', 'Bearer token_advisor')
        .send({ active: false })
        .expect(403);
    });

    it('rejects the request without authentication with 401', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${id}/status`)
        .send({ active: false })
        .expect(401);
    });
  });

  describe('Primary contact of the client', () => {
    it('keeps a single primary contact when another one is promoted', async () => {
      context = await createTestApp();
      const first = await createContact(context, { isPrimary: true });
      const second = await createContact(context);

      await request(context.app.getHttpServer())
        .patch(`/api/clients/1/contacts/${second}`)
        .set('Authorization', 'Bearer token_admin')
        .send({ isPrimary: true })
        .expect(200);

      const response = await request(context.app.getHttpServer())
        .get('/api/clients/1/contacts')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      const primaries = response.body.filter(
        (contact: { isPrimary: boolean }) => contact.isPrimary,
      );
      expect(primaries).toHaveLength(1);
      expect(primaries[0].id).toBe(second);

      // The previous primary contact keeps its data, it is only demoted.
      const demoted = await request(context.app.getHttpServer())
        .get(`/api/clients/1/contacts/${first}`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(demoted.body.isPrimary).toBe(false);
      expect(demoted.body.active).toBe(true);

      const entry = context.activityLog.entries.find(
        (e) => e.action === 'contact.primary_changed',
      );
      expect(entry).toBeDefined();
      expect(entry?.clientId).toBe(1);
    });

    it('demotes the previous primary contact when a new one is created as primary', async () => {
      context = await createTestApp();
      const first = await createContact(context, { isPrimary: true });
      await createContact(context, { isPrimary: true });

      const contacts = await context.contacts.findByClient(1);
      const primaries = contacts.filter((contact) => contact.isPrimary);
      expect(primaries).toHaveLength(1);
      expect(primaries[0].id).not.toBe(first);
    });
  });

  describe('Relationship between client and contact', () => {
    it('stores the contact under the client of the route', async () => {
      context = await createTestApp();
      const id = await createContact(context);

      const response = await request(context.app.getHttpServer())
        .get(`/api/clients/1/contacts/${id}`)
        .set('Authorization', 'Bearer token_admin')
        .expect(200);

      expect(response.body.clientId).toBe(1);

      const stored = await context.contacts.findById(id);
      expect(stored?.clientId).toBe(1);
    });
  });

  describe('Swagger documentation', () => {
    it('documents the contacts endpoints in the OpenAPI document', async () => {
      context = await createTestApp();

      const response = await request(context.app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.paths).toHaveProperty(
        '/api/clients/{clientId}/contacts',
      );
      expect(response.body.paths).toHaveProperty(
        '/api/clients/{clientId}/contacts/{id}',
      );
      expect(response.body.paths).toHaveProperty(
        '/api/clients/{clientId}/contacts/{id}/status',
      );
      expect(
        response.body.paths['/api/clients/{clientId}/contacts'].post.tags,
      ).toContain('contacts');
    });
  });
});
