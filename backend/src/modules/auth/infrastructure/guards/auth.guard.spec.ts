import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { AuthServicePort } from '../../domain/ports/auth-service.port.js';
import { AuthUser } from '../../domain/entities/auth-user.entity.js';
import { AuthSession } from '../../domain/entities/auth-session.entity.js';
import { UserRole } from '../../domain/types/user-role.enum.js';

function createMockContext(headers: Record<string, string> = {}) {
  const request: Record<string, unknown> = {
    headers,
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('AuthGuard', () => {
  const dummyUser = new AuthUser({
    id: 'user-1',
    email: 'user@example.com',
    name: 'User 1',
    role: UserRole.Advisor,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const dummySession = new AuthSession({
    id: 's-1',
    token: 'valid-token',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 3600 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('allows access and attaches user when session is valid', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn().mockResolvedValue({
        user: dummyUser,
        session: dummySession,
      }),
      signUpEmail: vi.fn(),
    };
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const guard = new AuthGuard(authService, reflector);
    const { context, request } = createMockContext({
      authorization: 'Bearer valid-token',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBe(dummyUser);
    expect(request.session).toBe(dummySession);
  });

  it('throws UnauthorizedException when session verification returns null', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn().mockResolvedValue(null),
      signUpEmail: vi.fn(),
    };
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const guard = new AuthGuard(authService, reflector);
    const { context } = createMockContext({
      authorization: 'Bearer invalid-token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows access without credentials if route is public', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const guard = new AuthGuard(authService, reflector);
    const { context } = createMockContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(authService.verifySession).not.toHaveBeenCalled();
  });
});
