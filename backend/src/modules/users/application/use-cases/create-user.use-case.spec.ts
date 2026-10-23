import { describe, expect, it, vi } from 'vitest';
import { CreateUserUseCase } from './create-user.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User, UserProps } from '../../domain/entities/user.entity.js';
import { AuthServicePort } from '../../../auth/domain/ports/auth-service.port.js';
import { AuthUser } from '../../../auth/domain/entities/auth-user.entity.js';
import { AuthSession } from '../../../auth/domain/entities/auth-session.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import {
  AdvisorProfilePort,
  AdvisorStatus,
} from '../ports/advisor-profile.port.js';

function createAdvisorProfiles(): AdvisorProfilePort {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    deactivate: vi.fn().mockResolvedValue(undefined),
  };
}

function copyUser(user: User, changes: Partial<UserProps>): User {
  return new User({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...changes,
  });
}

describe('CreateUserUseCase', () => {
  const adminActor = { id: 'admin-1', role: UserRole.Admin };
  const directorActor = { id: 'director-1', role: UserRole.Director };
  const dummyAuthUser = new AuthUser({
    id: 'user-new',
    email: 'newuser@example.com',
    name: 'New Advisor',
    role: UserRole.Advisor,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const dummyUser = new User({
    id: 'user-new',
    name: 'New Advisor',
    email: 'newuser@example.com',
    role: UserRole.Advisor,
    isActive: true,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('creates user successfully via AuthService and returns user', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyUser),
      findByEmail: vi.fn().mockResolvedValue(null),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn().mockResolvedValue({
        user: dummyAuthUser,
        session: new AuthSession({
          id: 'sess-1',
          token: 'token-1',
          userId: 'user-new',
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        token: 'token-1',
      }),
    };

    const useCase = new CreateUserUseCase(
      userRepository,
      authService,
      createAdvisorProfiles(),
    );
    const result = await useCase.execute({
      actor: adminActor,
      name: 'New Advisor',
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
      role: UserRole.Advisor,
    });

    expect(result.id).toBe('user-new');
    expect(result.email).toBe('newuser@example.com');
    expect(authService.signUpEmail).toHaveBeenCalledWith({
      name: 'New Advisor',
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
      role: UserRole.Advisor,
    });
  });

  it('throws ValidationError for invalid input', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const useCase = new CreateUserUseCase(
      userRepository,
      authService,
      createAdvisorProfiles(),
    );

    await expect(
      useCase.execute({
        actor: adminActor,
        name: '',
        email: 'invalid-email',
        password: 'short',
        role: UserRole.Advisor,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ConflictError if email is already registered', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(dummyUser),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const useCase = new CreateUserUseCase(
      userRepository,
      authService,
      createAdvisorProfiles(),
    );

    await expect(
      useCase.execute({
        actor: adminActor,
        name: 'Existing User',
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        role: UserRole.Advisor,
      }),
    ).rejects.toThrow(ConflictError);
  });

  describe('advisor record', () => {
    function createRepository(user: User): UserRepository {
      return {
        findAll: vi.fn(),
        findById: vi.fn().mockResolvedValue(user),
        findByEmail: vi.fn().mockResolvedValue(null),
        countActiveAdmins: vi.fn(),
        update: vi.fn(),
      };
    }

    function createAuthService(): AuthServicePort {
      return {
        signInEmail: vi.fn(),
        signOut: vi.fn(),
        verifySession: vi.fn(),
        signUpEmail: vi.fn().mockResolvedValue({
          user: dummyAuthUser,
          session: new AuthSession({
            id: 'sess-1',
            token: 'token-1',
            userId: 'user-new',
            expiresAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          token: 'token-1',
        }),
      };
    }

    it('creates the advisor record when the new user is an advisor', async () => {
      const advisorProfiles = createAdvisorProfiles();
      const useCase = new CreateUserUseCase(
        createRepository(dummyUser),
        createAuthService(),
        advisorProfiles,
      );

      await useCase.execute({
        actor: adminActor,
        name: 'New Advisor',
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        role: UserRole.Advisor,
      });

      expect(advisorProfiles.save).toHaveBeenCalledWith({
        userId: 'user-new',
        name: 'New Advisor',
        email: 'newuser@example.com',
        status: AdvisorStatus.Active,
      });
    });

    it('does not touch the advisor table for other roles', async () => {
      const advisorProfiles = createAdvisorProfiles();
      const useCase = new CreateUserUseCase(
        createRepository(copyUser(dummyUser, { role: UserRole.Director })),
        createAuthService(),
        advisorProfiles,
      );

      await useCase.execute({
        actor: adminActor,
        name: 'New Director',
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        role: UserRole.Director,
      });

      expect(advisorProfiles.save).not.toHaveBeenCalled();
      expect(advisorProfiles.deactivate).not.toHaveBeenCalled();
    });
  });

  it('forbids directors from creating users with non-advisor roles', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };
    const useCase = new CreateUserUseCase(
      userRepository,
      authService,
      createAdvisorProfiles(),
    );

    await expect(
      useCase.execute({
        actor: directorActor,
        name: 'New Director',
        email: 'director@example.com',
        password: 'StrongPassword123!',
        role: UserRole.Director,
      }),
    ).rejects.toThrow(ForbiddenError);
    expect(authService.signUpEmail).not.toHaveBeenCalled();
  });

  it('allows directors to create advisors and synchronizes the advisor profile', async () => {
    const advisorProfiles = createAdvisorProfiles();
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyUser),
      findByEmail: vi.fn().mockResolvedValue(null),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn().mockResolvedValue({
        user: dummyAuthUser,
        session: new AuthSession({
          id: 'sess-1',
          token: 'token-1',
          userId: 'user-new',
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        token: 'token-1',
      }),
    };
    const useCase = new CreateUserUseCase(userRepository, authService, advisorProfiles);

    const created = await useCase.execute({
      actor: directorActor,
      name: 'New Advisor',
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
      role: UserRole.Advisor,
    });

    expect(created.role).toBe(UserRole.Advisor);
    expect(advisorProfiles.save).toHaveBeenCalledWith(expect.objectContaining({
      userId: created.id,
      status: AdvisorStatus.Active,
    }));
  });
});
