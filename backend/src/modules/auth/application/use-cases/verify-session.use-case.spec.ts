import { describe, expect, it, vi } from 'vitest';
import { VerifySessionUseCase } from './verify-session.use-case.js';
import { AuthServicePort } from '../../domain/ports/auth-service.port.js';
import { AuthUser } from '../../domain/entities/auth-user.entity.js';
import { AuthSession } from '../../domain/entities/auth-session.entity.js';
import { UserRole } from '../../domain/types/user-role.enum.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/index.js';

describe('VerifySessionUseCase', () => {
  const dummyUser = new AuthUser({
    id: 'user-123',
    email: 'advisor@example.com',
    name: 'Advisor User',
    role: UserRole.Advisor,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const validSession = new AuthSession({
    id: 'sess-123',
    token: 'token-abc',
    userId: 'user-123',
    expiresAt: new Date(Date.now() + 3600 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const expiredSession = new AuthSession({
    id: 'sess-expired',
    token: 'token-exp',
    userId: 'user-123',
    expiresAt: new Date(Date.now() - 3600 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('returns user and session for valid session', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn().mockResolvedValue({
        user: dummyUser,
        session: validSession,
      }),
      signUpEmail: vi.fn(),
    };

    const useCase = new VerifySessionUseCase(authService);
    const result = await useCase.execute('token-abc');

    expect(result.user.id).toBe('user-123');
    expect(result.user.role).toBe(UserRole.Advisor);
    expect(result.session.token).toBe('token-abc');
  });

  it('throws UnauthorizedError if session is not found or invalid', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn().mockResolvedValue(null),
      signUpEmail: vi.fn(),
    };

    const useCase = new VerifySessionUseCase(authService);

    await expect(useCase.execute('invalid-token')).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('throws UnauthorizedError if session is expired', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn().mockResolvedValue({
        user: dummyUser,
        session: expiredSession,
      }),
      signUpEmail: vi.fn(),
    };

    const useCase = new VerifySessionUseCase(authService);

    await expect(useCase.execute('token-exp')).rejects.toThrow(
      'Session has expired',
    );
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
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn().mockResolvedValue({
        user: bannedUser,
        session: validSession,
      }),
      signUpEmail: vi.fn(),
    };

    const useCase = new VerifySessionUseCase(authService);

    await expect(useCase.execute('token-abc')).rejects.toThrow(
      'Account is suspended',
    );
  });
});
