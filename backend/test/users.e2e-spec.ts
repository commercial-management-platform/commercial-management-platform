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
import {
  USER_REPOSITORY,
  type UserRepository,
  type UserFilterOptions,
  type UpdateUserData,
} from '../src/modules/users/domain/ports/user.repository.js';
import { User } from '../src/modules/users/domain/entities/user.entity.js';
import { ListUsersUseCase } from '../src/modules/users/application/use-cases/list-users.use-case.js';
import { GetUserUseCase } from '../src/modules/users/application/use-cases/get-user.use-case.js';
import { CreateUserUseCase } from '../src/modules/users/application/use-cases/create-user.use-case.js';
import { UpdateUserUseCase } from '../src/modules/users/application/use-cases/update-user.use-case.js';
import { ChangeUserRoleUseCase } from '../src/modules/users/application/use-cases/change-user-role.use-case.js';
import { SetUserStatusUseCase } from '../src/modules/users/application/use-cases/set-user-status.use-case.js';
import { UsersController } from '../src/modules/users/presentation/users.controller.js';
import { AuthGuard } from '../src/modules/auth/infrastructure/guards/auth.guard.js';
import { RolesGuard } from '../src/modules/auth/infrastructure/guards/roles.guard.js';
import { NotFoundError } from '../src/shared/domain/errors/index.js';

class InMemoryAuthService implements AuthServicePort {
  private sessions = new Map<string, { user: AuthUser; session: AuthSession }>();

  constructor() {
    this.createSession('token_admin', 'usr_admin_1', 'admin@cmp.com', 'Admin User', UserRole.Admin);
    this.createSession('token_advisor', 'usr_advisor_1', 'advisor@cmp.com', 'Advisor User', UserRole.Advisor);
    this.createSession('token_director', 'usr_director_1', 'director@cmp.com', 'Director User', UserRole.Director);
  }

  private createSession(
    token: string,
    id: string,
    email: string,
    name: string,
    role: UserRole,
  ) {
    const user = new AuthUser({
      id,
      email,
      name,
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

  async signInEmail() {
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

  async signUpEmail(params: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }) {
    const role = params.role ?? UserRole.Advisor;
    const token = `token_${Date.now()}`;
    const user = new AuthUser({
      id: `usr_${Date.now()}`,
      email: params.email.toLowerCase(),
      name: params.name,
      role,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const session = new AuthSession({
      id: `sess_${token}`,
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.sessions.set(token, { user, session });
    return { user, session, token };
  }
}

class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, User>();

  constructor() {
    this.reset();
  }

  reset() {
    this.users.clear();
    const admin = new User({
      id: 'usr_admin_1',
      email: 'admin@cmp.com',
      name: 'Admin User',
      role: UserRole.Admin,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const advisor = new User({
      id: 'usr_advisor_1',
      email: 'advisor@cmp.com',
      name: 'Advisor User',
      role: UserRole.Advisor,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const director = new User({
      id: 'usr_director_1',
      email: 'director@cmp.com',
      name: 'Director User',
      role: UserRole.Director,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.users.set(admin.id, admin);
    this.users.set(advisor.id, advisor);
    this.users.set(director.id, director);
  }

  async findAll(options?: UserFilterOptions): Promise<User[]> {
    let result = Array.from(this.users.values());
    if (options?.role) {
      result = result.filter((u) => u.role === options.role);
    }
    if (options?.isActive !== undefined) {
      result = result.filter((u) => u.isActive === options.isActive);
    }
    if (options?.search) {
      const s = options.search.toLowerCase();
      result = result.filter(
        (u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s),
      );
    }
    return result;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const target = email.toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === target) return u;
    }
    return null;
  }

  async countActiveAdmins(): Promise<number> {
    let count = 0;
    for (const u of this.users.values()) {
      if (u.role === UserRole.Admin && u.isActive) count++;
    }
    return count;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }

    const isCurrentlyActiveAdmin =
      existing.role === UserRole.Admin && existing.isActive;
    const isDemotingAdmin =
      data.role !== undefined && data.role !== UserRole.Admin;
    const isDeactivatingAdmin = data.isActive === false;

    if (isCurrentlyActiveAdmin && (isDemotingAdmin || isDeactivatingAdmin)) {
      const activeAdminsCount = await this.countActiveAdmins();
      if (activeAdminsCount <= 1) {
        if (isDemotingAdmin) {
          throw new ConflictError(
            'Cannot change role: the platform must have at least one active administrator',
          );
        }
        if (isDeactivatingAdmin) {
          throw new ConflictError(
            'Cannot deactivate the last active administrator',
          );
        }
      }
    }

    const updated = new User({
      id: existing.id,
      name: data.name ?? existing.name,
      email: existing.email,
      role: data.role ?? existing.role,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      emailVerified: existing.emailVerified,
      image: data.image !== undefined ? data.image : existing.image,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    this.users.set(id, updated);
    return updated;
  }

  addDirect(user: User) {
    this.users.set(user.id, user);
  }
}

describe('Users API (e2e)', () => {
  let app: INestApplication<App>;
  let userRepo: InMemoryUserRepository;
  let authService: InMemoryAuthService;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    authService = new InMemoryAuthService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
          validate: validateEnv,
        }),
      ],
      controllers: [UsersController],
      providers: [
        { provide: USER_REPOSITORY, useValue: userRepo },
        { provide: AUTH_SERVICE_PORT, useValue: authService },
        {
          provide: ListUsersUseCase,
          inject: [USER_REPOSITORY],
          useFactory: (repo: UserRepository) => new ListUsersUseCase(repo),
        },
        {
          provide: GetUserUseCase,
          inject: [USER_REPOSITORY],
          useFactory: (repo: UserRepository) => new GetUserUseCase(repo),
        },
        {
          provide: CreateUserUseCase,
          inject: [USER_REPOSITORY, AUTH_SERVICE_PORT],
          useFactory: (repo: UserRepository, auth: AuthServicePort) =>
            new CreateUserUseCase(repo, auth),
        },
        {
          provide: UpdateUserUseCase,
          inject: [USER_REPOSITORY],
          useFactory: (repo: UserRepository) => new UpdateUserUseCase(repo),
        },
        {
          provide: ChangeUserRoleUseCase,
          inject: [USER_REPOSITORY],
          useFactory: (repo: UserRepository) => new ChangeUserRoleUseCase(repo),
        },
        {
          provide: SetUserStatusUseCase,
          inject: [USER_REPOSITORY],
          useFactory: (repo: UserRepository) => new SetUserStatusUseCase(repo),
        },
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

  describe('Authorization & Access Control (CA-07)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/users');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication required');
    });

    it('rejects non-admin (advisor) requests with 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer token_advisor');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('lacks permission');
    });

    it('rejects non-admin (director) requests with 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer token_director');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('lacks permission');
    });
  });

  describe('List Users (CA-01)', () => {
    it('allows admin to list all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer token_admin');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });

    it('filters users by role (Spanish role GERENTE -> director)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?role=GERENTE')
        .set('Authorization', 'Bearer token_admin');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].email).toBe('director@cmp.com');
      expect(response.body[0].role).toBe(UserRole.Director);
    });
  });

  describe('Create User (CA-02, CA-05, CA-09)', () => {
    it('creates a new user successfully with role ASESOR', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer token_admin')
        .send({
          name: 'Nuevo Asesor',
          email: 'nuevo.asesor@cmp.com',
          password: 'Password123!',
          role: 'ASESOR',
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('nuevo.asesor@cmp.com');
      expect(response.body.role).toBe(UserRole.Advisor);
      expect(response.body.isActive).toBe(true);
    });

    it('returns 400 when role is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer token_admin')
        .send({
          name: 'Bad Role',
          email: 'bad.role@cmp.com',
          password: 'Password123!',
          role: 'INVALID_ROLE',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid role');
    });

    it('returns 400 when required fields or format are invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer token_admin')
        .send({
          name: '',
          email: 'not-an-email',
          password: 'short',
          role: 'ASESOR',
        });

      expect(response.status).toBe(400);
    });

    it('returns 409 when email already exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer token_admin')
        .send({
          name: 'Duplicated User',
          email: 'admin@cmp.com',
          password: 'Password123!',
          role: 'ASESOR',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('Consult Individual User (CA-03)', () => {
    it('returns user details when id exists', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/usr_advisor_1')
        .set('Authorization', 'Bearer token_admin');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('usr_advisor_1');
      expect(response.body.email).toBe('advisor@cmp.com');
    });

    it('returns 404 when user id does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/non_existent_id')
        .set('Authorization', 'Bearer token_admin');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Update User Profile (CA-04)', () => {
    it('updates permitted profile fields', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/usr_advisor_1')
        .set('Authorization', 'Bearer token_admin')
        .send({
          name: 'Advisor Actualizado',
          image: 'https://example.com/avatar.png',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Advisor Actualizado');
      expect(response.body.image).toBe('https://example.com/avatar.png');
    });

    it('returns 404 when updating non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/missing_user')
        .set('Authorization', 'Bearer token_admin')
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });

    it('returns 400 when updating with empty body', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/usr_advisor_1')
        .set('Authorization', 'Bearer token_admin')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('At least one field');
    });
  });

  describe('Change User Role and Admin Protection (CA-05, CA-08)', () => {
    it('changes role from advisor to director', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/usr_advisor_1/role')
        .set('Authorization', 'Bearer token_admin')
        .send({ role: 'GERENTE' });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe(UserRole.Director);
    });

    it('CA-08: prevents demoting the last active administrator with 409', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/usr_admin_1/role')
        .set('Authorization', 'Bearer token_admin')
        .send({ role: 'ASESOR' });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain(
        'at least one active administrator',
      );
    });

    it('allows demoting an admin if another active admin exists', async () => {
      // First promote advisor to admin
      await request(app.getHttpServer())
        .patch('/api/users/usr_advisor_1/role')
        .set('Authorization', 'Bearer token_admin')
        .send({ role: 'ADMINISTRADOR' });

      // Now 2 active admins exist, so demoting usr_admin_1 should succeed
      const response = await request(app.getHttpServer())
        .patch('/api/users/usr_admin_1/role')
        .set('Authorization', 'Bearer token_admin')
        .send({ role: 'GERENTE' });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe(UserRole.Director);
    });
  });

  describe('Account Activation / Deactivation (CA-06, CA-08)', () => {
    it('deactivates an advisor account without deleting history', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/usr_advisor_1/status')
        .set('Authorization', 'Bearer token_admin')
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);

      // Verify the user is still in the database and readable
      const checkResponse = await request(app.getHttpServer())
        .get('/api/users/usr_advisor_1')
        .set('Authorization', 'Bearer token_admin');

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.isActive).toBe(false);
    });

    it('reactivates a previously deactivated account', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/usr_advisor_1/status')
        .set('Authorization', 'Bearer token_admin')
        .send({ isActive: true });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(true);
    });

    it('CA-08: prevents deactivating the last active administrator with 409', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/users/usr_admin_1/status')
        .set('Authorization', 'Bearer token_admin')
        .send({ isActive: false });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain(
        'Cannot deactivate the last active administrator',
      );
    });
  });
});
