import { describe, expect, it, vi } from 'vitest';
import { CreateUserUseCase } from './create-user.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { AuthServicePort } from '../../../auth/domain/ports/auth-service.port.js';
import { AuthUser } from '../../../auth/domain/entities/auth-user.entity.js';
import { AuthSession } from '../../../auth/domain/entities/auth-session.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

describe('CreateUserUseCase', () => {
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

    const useCase = new CreateUserUseCase(userRepository, authService);
    const result = await useCase.execute({
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

    const useCase = new CreateUserUseCase(userRepository, authService);

    await expect(
      useCase.execute({
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

    const useCase = new CreateUserUseCase(userRepository, authService);

    await expect(
      useCase.execute({
        name: 'Existing User',
        email: 'newuser@example.com',
        password: 'StrongPassword123!',
        role: UserRole.Advisor,
      }),
    ).rejects.toThrow(ConflictError);
  });
});
