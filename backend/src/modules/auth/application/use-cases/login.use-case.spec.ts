import { describe, expect, it, vi } from 'vitest';
import { LoginUseCase } from './login.use-case.js';
import { AuthServicePort } from '../../domain/ports/auth-service.port.js';
import { AuthUser } from '../../domain/entities/auth-user.entity.js';
import { AuthSession } from '../../domain/entities/auth-session.entity.js';
import { UserRole } from '../../domain/types/user-role.enum.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/index.js';

describe('LoginUseCase', () => {
  const dummyUser = new AuthUser({
    id: 'user-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.Admin,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const dummySession = new AuthSession({
    id: 'sess-123',
    token: 'token-abc',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 3600 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('authenticates user with valid credentials', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn().mockResolvedValue({
        user: dummyUser,
        session: dummySession,
        token: 'token-abc',
      }),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const useCase = new LoginUseCase(authService);
    const result = await useCase.execute({
      email: 'admin@example.com',
      password: 'validPassword123',
    });

    expect(result.token).toBe('token-abc');
    expect(result.user.role).toBe(UserRole.Admin);
    expect(authService.signInEmail).toHaveBeenCalledWith(
      'admin@example.com',
      'validPassword123',
    );
  });

  it('throws UnauthorizedError if email or password are empty', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const useCase = new LoginUseCase(authService);

    await expect(
      useCase.execute({ email: '', password: '123' }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('throws UnauthorizedError if user is banned', async () => {
    const bannedUser = new AuthUser({
      id: dummyUser.id,
      email: dummyUser.email,
      name: dummyUser.name,
      role: dummyUser.role,
      emailVerified: dummyUser.emailVerified,
      createdAt: dummyUser.createdAt,
      updatedAt: dummyUser.updatedAt,
      banned: true,
    });

    const authService: AuthServicePort = {
      signInEmail: vi.fn().mockResolvedValue({
        user: bannedUser,
        session: dummySession,
        token: 'token-abc',
      }),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const useCase = new LoginUseCase(authService);

    await expect(
      useCase.execute({
        email: 'banned@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow('Account is suspended');
  });
});
