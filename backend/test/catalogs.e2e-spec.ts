import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../src/config/env.validation.js';
import {
  AUTH_SERVICE_PORT,
  type AuthServicePort,
} from '../src/modules/auth/domain/ports/auth-service.port.js';
import { AuthUser } from '../src/modules/auth/domain/entities/auth-user.entity.js';
import { AuthSession } from '../src/modules/auth/domain/entities/auth-session.entity.js';
import { UserRole } from '../src/modules/auth/domain/types/user-role.enum.js';
import { AuthGuard } from '../src/modules/auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../src/modules/auth/infrastructure/guards/roles.guard.js';
import type {
  CatalogEntry,
  CatalogRepository,
  CatalogType,
  FindCatalogEntriesOptions,
} from '../src/modules/catalogs/domain/repositories/catalog.repository.js';
import { CreateCatalogEntryUseCase } from '../src/modules/catalogs/application/use-cases/create-catalog-entry.use-case.js';
import { GetCatalogEntriesUseCase } from '../src/modules/catalogs/application/use-cases/get-catalog-entries.use-case.js';
import { SetCatalogEntryStatusUseCase } from '../src/modules/catalogs/application/use-cases/set-catalog-entry-status.use-case.js';
import { UpdateCatalogEntryUseCase } from '../src/modules/catalogs/application/use-cases/update-catalog-entry.use-case.js';
import { CatalogsController } from '../src/modules/catalogs/presentation/catalogs.controller.js';

class InMemoryAuthService implements AuthServicePort {
  private sessions = new Map<
    string,
    { user: AuthUser; session: AuthSession }
  >();

  constructor() {
    this.createSession('token_admin', UserRole.Admin);
    this.createSession('token_director', UserRole.Director);
    this.createSession('token_advisor', UserRole.Advisor);
  }

  private createSession(token: string, role: UserRole) {
    const id = `usr_${role}`;
    const user = new AuthUser({
      id,
      email: `${role}@cmp.com`,
      name: `${role} user`,
      role,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const session = new AuthSession({
      id: `sess_${token}`,
      token,
      userId: id,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.sessions.set(token, { user, session });
  }

  async signInEmail(): Promise<never> {
    throw new Error('Not implemented');
  }

  async signOut() {}

  async verifySession(
    headersOrToken: Record<string, string | string[] | undefined> | string,
  ) {
    let token: string | undefined;
    if (typeof headersOrToken === 'string') {
      token = headersOrToken;
    } else if (headersOrToken?.authorization) {
      const auth = headersOrToken.authorization as string;
      if (auth.startsWith('Bearer ')) token = auth.slice(7);
    }

    if (!token) return null;
    return this.sessions.get(token) ?? null;
  }

  async signUpEmail(): Promise<never> {
    throw new Error('Not implemented');
  }
}

/** Mimics the uq_<table>_name_lower index: names are unique case-insensitively. */
class InMemoryCatalogRepository implements CatalogRepository {
  private entries = new Map<CatalogType, CatalogEntry[]>();
  private nextId = 1;

  constructor() {
    for (const name of ['Norte', 'Sur']) {
      this.list('zone').push({ id: this.nextId++, name, active: true });
    }
  }

  private list(type: CatalogType): CatalogEntry[] {
    if (!this.entries.has(type)) this.entries.set(type, []);
    return this.entries.get(type)!;
  }

  async findAll(type: CatalogType, options: FindCatalogEntriesOptions = {}) {
    return this.list(type).filter((e) => options.includeInactive || e.active);
  }

  async findById(type: CatalogType, id: number) {
    return this.list(type).find((e) => e.id === id) ?? null;
  }

  async findByName(type: CatalogType, name: string) {
    return (
      this.list(type).find(
        (e) => e.name.toLowerCase() === name.toLowerCase(),
      ) ?? null
    );
  }

  async create(type: CatalogType, entry: CatalogEntry) {
    const created = { ...entry, id: this.nextId++ };
    this.list(type).push(created);
    return created;
  }

  async update(type: CatalogType, entry: CatalogEntry) {
    const existing = await this.findById(type, entry.id!);
    Object.assign(existing!, entry);
    return existing!;
  }

  async setActive(type: CatalogType, id: number, active: boolean) {
    const existing = await this.findById(type, id);
    existing!.active = active;
  }
}

describe('Catalogs (e2e)', () => {
  let app: INestApplication<App>;

  const READ_ENDPOINTS = [
    'zones',
    'client-types',
    'potentials',
    'client-statuses',
    'visit-results',
    'visit-objectives',
    'visit-types',
    'portfolios',
  ];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
          validate: validateEnv,
        }),
      ],
      controllers: [CatalogsController],
      providers: [
        { provide: AUTH_SERVICE_PORT, useValue: new InMemoryAuthService() },
        {
          provide: 'CatalogRepository',
          useValue: new InMemoryCatalogRepository(),
        },
        GetCatalogEntriesUseCase,
        CreateCatalogEntryUseCase,
        UpdateCatalogEntryUseCase,
        SetCatalogEntryStatusUseCase,
        AuthGuard,
        RolesGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  describe('read access', () => {
    it.each(READ_ENDPOINTS)(
      'GET /api/catalogs/%s returns 401 without token',
      async (path) => {
        await request(app.getHttpServer())
          .get(`/api/catalogs/${path}`)
          .expect(401);
      },
    );

    it.each(['token_admin', 'token_director', 'token_advisor'])(
      'GET /api/catalogs/zones returns 200 for %s',
      async (token) => {
        const res = await request(app.getHttpServer())
          .get('/api/catalogs/zones')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.map((e: CatalogEntry) => e.name)).toEqual([
          'Norte',
          'Sur',
        ]);
      },
    );

    it.each(READ_ENDPOINTS)(
      'GET /api/catalogs/%s returns 200 for advisor',
      async (path) => {
        await request(app.getHttpServer())
          .get(`/api/catalogs/${path}`)
          .set('Authorization', 'Bearer token_advisor')
          .expect(200);
      },
    );
  });

  describe('write access', () => {
    const writes = [
      {
        method: 'post',
        path: '/api/catalogs/zones',
        body: { name: 'Oriente' },
      },
      {
        method: 'patch',
        path: '/api/catalogs/zones/1',
        body: { name: 'Norte 2' },
      },
      {
        method: 'patch',
        path: '/api/catalogs/zones/1/status',
        body: { active: false },
      },
    ] as const;

    it.each(writes)(
      '$method $path returns 401 without token',
      async ({ method, path, body }) => {
        await request(app.getHttpServer())[method](path).send(body).expect(401);
      },
    );

    for (const token of ['token_director', 'token_advisor']) {
      it.each(writes)(
        `$method $path returns 403 for ${token}`,
        async ({ method, path, body }) => {
          await request(app.getHttpServer())
            [method](path)
            .set('Authorization', `Bearer ${token}`)
            .send(body)
            .expect(403);
        },
      );
    }

    it('admin creates a zone', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/catalogs/zones')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: '  Oriente  ' })
        .expect(201);
      expect(res.body).toMatchObject({ name: 'Oriente', active: true });
    });

    it('admin updates a zone', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/catalogs/zones/1')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'Zona Norte' })
        .expect(200);
      expect(res.body).toMatchObject({ id: 1, name: 'Zona Norte' });
    });

    it('admin deactivates a zone', async () => {
      await request(app.getHttpServer())
        .patch('/api/catalogs/zones/1/status')
        .set('Authorization', 'Bearer token_admin')
        .send({ active: false })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/catalogs/zones?includeInactive=true')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(res.body.find((e: CatalogEntry) => e.id === 1).active).toBe(false);
    });

    it('returns 409 when creating a zone whose name differs only in case', async () => {
      await request(app.getHttpServer())
        .post('/api/catalogs/zones')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'NORTE' })
        .expect(409);
    });

    it('returns 409 when renaming a zone to another existing name', async () => {
      await request(app.getHttpServer())
        .patch('/api/catalogs/zones/1')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'sur' })
        .expect(409);
    });

    it('returns 404 when updating an unknown zone', async () => {
      await request(app.getHttpServer())
        .patch('/api/catalogs/zones/999')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'Nada' })
        .expect(404);
    });

    it('rejects an empty name with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/catalogs/zones')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: '' })
        .expect(400);
    });

    it('rejects a name made only of spaces with 400 on create', async () => {
      await request(app.getHttpServer())
        .post('/api/catalogs/zones')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: ' ' })
        .expect(400);
    });

    it('rejects a name made only of spaces with 400 on update', async () => {
      await request(app.getHttpServer())
        .patch('/api/catalogs/zones/1')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: '   ' })
        .expect(400);
    });

    it('accepts a name of 100 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/catalogs/zones')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'a'.repeat(100) })
        .expect(201);
    });

    it('rejects a name longer than 100 characters with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/catalogs/zones')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'a'.repeat(101) })
        .expect(400);
    });
  });

  describe('inactive entries', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .patch('/api/catalogs/zones/1/status')
        .set('Authorization', 'Bearer token_admin')
        .send({ active: false })
        .expect(200);
    });

    const names = (body: CatalogEntry[]) => body.map((e) => e.name);

    it.each(['token_admin', 'token_director', 'token_advisor'])(
      'GET /api/catalogs/zones hides inactive entries by default for %s',
      async (token) => {
        const res = await request(app.getHttpServer())
          .get('/api/catalogs/zones')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(names(res.body)).toEqual(['Sur']);
      },
    );

    it('admin lists inactive entries with includeInactive=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/catalogs/zones?includeInactive=true')
        .set('Authorization', 'Bearer token_admin')
        .expect(200);
      expect(names(res.body)).toEqual(['Norte', 'Sur']);
    });

    it.each(['token_director', 'token_advisor'])(
      'includeInactive=true is ignored for %s',
      async (token) => {
        const res = await request(app.getHttpServer())
          .get('/api/catalogs/zones?includeInactive=true')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(names(res.body)).toEqual(['Sur']);
      },
    );

    it('rejects a non-boolean includeInactive with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/catalogs/zones?includeInactive=yes')
        .set('Authorization', 'Bearer token_admin')
        .expect(400);
    });
  });
});
