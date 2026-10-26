import { describe, it, expect, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configureApp } from '../src/app.setup.js';
import {
  AUTH_SERVICE_PORT,
  type AuthServicePort,
} from '../src/modules/auth/domain/ports/auth-service.port.js';
import { AuthUser } from '../src/modules/auth/domain/entities/auth-user.entity.js';
import { AuthSession } from '../src/modules/auth/domain/entities/auth-session.entity.js';
import { UserRole } from '../src/modules/auth/domain/types/user-role.enum.js';
import { UnauthorizedError } from '../src/shared/domain/errors/index.js';

class InMemoryAuthService implements AuthServicePort {
  private users = new Map<string, { user: AuthUser; password: string }>();
  private sessions = new Map<string, { user: AuthUser; session: AuthSession }>();

  constructor() {
    const adminUser = new AuthUser({
      id: 'usr_admin_1',
      email: 'admin@cmp.com',
      name: 'Admin User',
      role: UserRole.Admin,
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

    this.users.set(adminUser.email, {
      user: adminUser,
      password: 'ValidPassword123!',
    });
    this.users.set(advisorUser.email, {
      user: advisorUser,
      password: 'ValidPassword123!',
    });
  }

  async signInEmail(email: string, password: string) {
    const record = this.users.get(email.toLowerCase());
    if (!record || record.password !== password) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = `sess_token_${Date.now()}`;
    const session = new AuthSession({
      id: token,
      token,
      userId: record.user.id,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.sessions.set(token, { user: record.user, session });
    return { user: record.user, session, token };
  }

  async signOut(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async verifySession(
    headersOrToken: Record<string, string | string[] | undefined> | string,
  ) {
    let token: string | undefined;

    if (typeof headersOrToken === 'string') {
      token = headersOrToken;
    } else if (headersOrToken) {
      const authHeader = headersOrToken.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
      if (!token && typeof headersOrToken.cookie === 'string') {
        const match = headersOrToken.cookie.match(
          /better-auth\.session_token=([^;]+)/,
        );
        if (match) token = match[1];
      }
    }

    if (!token) return null;

    const sessionData = this.sessions.get(token);
    if (!sessionData) return null;

    if (sessionData.session.isExpired()) {
      this.sessions.delete(token);
      return null;
    }

    return sessionData;
  }

  async signUpEmail(params: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }) {
    const role = params.role ?? UserRole.Advisor;
    const user = new AuthUser({
      id: `usr_${Date.now()}`,
      email: params.email.toLowerCase(),
      name: params.name,
      role,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.users.set(user.email, { user, password: params.password });
    return this.signInEmail(params.email, params.password);
  }
}

import { AuthController } from '../src/modules/auth/presentation/auth.controller.js';
import { LoginUseCase } from '../src/modules/auth/application/use-cases/login.use-case.js';
import { LogoutUseCase } from '../src/modules/auth/application/use-cases/logout.use-case.js';
import { VerifySessionUseCase } from '../src/modules/auth/application/use-cases/verify-session.use-case.js';
import { AuthGuard } from '../src/modules/auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../src/modules/auth/infrastructure/guards/roles.guard.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from '../src/config/env.validation.js';

async function createTestApp(): Promise<INestApplication<App>> {
  const fakeAuthService = new InMemoryAuthService();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        cache: true,
        validate: validateEnv,
      }),
    ],
    controllers: [AuthController],
    providers: [
      {
        provide: AUTH_SERVICE_PORT,
        useValue: fakeAuthService,
      },
      {
        provide: LoginUseCase,
        inject: [AUTH_SERVICE_PORT],
        useFactory: (auth: AuthServicePort) => new LoginUseCase(auth),
      },
      {
        provide: LogoutUseCase,
        inject: [AUTH_SERVICE_PORT],
        useFactory: (auth: AuthServicePort) => new LogoutUseCase(auth),
      },
      {
        provide: VerifySessionUseCase,
        inject: [AUTH_SERVICE_PORT],
        useFactory: (auth: AuthServicePort) => new VerifySessionUseCase(auth),
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

describe('Authentication (HU-01) - e2e', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/auth/login', () => {
    it('authenticates user with valid credentials and returns session token and user role', async () => {
      app = await createTestApp();

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@cmp.com',
          password: 'ValidPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        email: 'admin@cmp.com',
        name: 'Admin User',
        role: 'admin',
      });

      // Verify cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies ?? ''];
      expect(
        cookieArray.some((c) => c.includes('better-auth.session_token')),
      ).toBe(true);
    });

    it('rejects authentication with invalid credentials returning 401', async () => {
      app = await createTestApp();

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@cmp.com',
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    });

    it('rejects malformed email with 400 validation error', async () => {
      app = await createTestApp();

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
        })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns authenticated user profile and assigned role with valid Bearer token', async () => {
      app = await createTestApp();

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'advisor@cmp.com',
          password: 'ValidPassword123!',
        })
        .expect(200);

      const token = loginRes.body.token;

      const profileRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileRes.body).toMatchObject({
        email: 'advisor@cmp.com',
        name: 'Advisor User',
        role: 'advisor',
      });
    });

    it('rejects unauthenticated requests with 401', async () => {
      app = await createTestApp();

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('rejects requests with invalid token with 401', async () => {
      app = await createTestApp();

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer non-existent-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('invalidates the session so subsequent requests fail with 401', async () => {
      app = await createTestApp();

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@cmp.com',
          password: 'ValidPassword123!',
        })
        .expect(200);

      const token = loginRes.body.token;

      // Verify session is active
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Log out
      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(logoutRes.body).toEqual({ message: 'Logged out successfully' });

      // Verify cookie was cleared
      const cookies = logoutRes.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // Subsequent request with the invalidated token must fail
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('POST /api/auth/register (removed)', () => {
    it('is not exposed: public self-registration responds 404', async () => {
      app = await createTestApp();

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Intruder',
          email: 'intruder@cmp.com',
          password: 'Password123!',
          role: 'admin',
        })
        .expect(404);
    });
  });

  describe('OpenAPI / Swagger documentation', () => {
    it('serves Swagger documentation including auth endpoints', async () => {
      app = await createTestApp();

      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.paths).toHaveProperty('/api/auth/login');
      expect(response.body.paths).toHaveProperty('/api/auth/logout');
      expect(response.body.paths).toHaveProperty('/api/auth/me');
      expect(response.body.paths).not.toHaveProperty('/api/auth/register');
      expect(response.body.components.securitySchemes).toHaveProperty('bearer');
    });
  });
});
