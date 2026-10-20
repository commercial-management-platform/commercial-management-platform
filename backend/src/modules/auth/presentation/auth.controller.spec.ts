import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import { AuthController } from './auth.controller.js';
import { LoginUseCase } from '../application/use-cases/login.use-case.js';
import { LogoutUseCase } from '../application/use-cases/logout.use-case.js';
import { RegisterUseCase } from '../application/use-cases/register.use-case.js';
import { AuthUser } from '../domain/entities/auth-user.entity.js';
import { AuthSession } from '../domain/entities/auth-session.entity.js';
import { UserRole } from '../domain/types/user-role.enum.js';
import { AuthServicePort } from '../domain/ports/auth-service.port.js';

describe('AuthController', () => {
  const dummyUser = new AuthUser({
    id: 'usr-1',
    email: 'director@cmp.com',
    name: 'Director Comercial',
    role: UserRole.Director,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const dummySession = new AuthSession({
    id: 'sess-1',
    token: 'token-xyz',
    userId: 'usr-1',
    expiresAt: new Date(Date.now() + 3600 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  function createMockResponse(): Response {
    return {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as Response;
  }

  it('login returns token, user profile and sets session cookie', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn().mockResolvedValue({
        user: dummyUser,
        session: dummySession,
        token: 'token-xyz',
      }),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const loginUseCase = new LoginUseCase(authService);
    const logoutUseCase = new LogoutUseCase(authService);
    const registerUseCase = new RegisterUseCase(authService);

    const controller = new AuthController(
      loginUseCase,
      logoutUseCase,
      registerUseCase,
    );
    const mockRes = createMockResponse();

    const response = await controller.login(
      { email: 'director@cmp.com', password: 'Password123!' },
      mockRes,
    );

    expect(response.token).toBe('token-xyz');
    expect(response.user.email).toBe('director@cmp.com');
    expect(response.user.role).toBe(UserRole.Director);
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'better-auth.session_token',
      'token-xyz',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
  });

  it('logout invalidates token and clears cookie', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const loginUseCase = new LoginUseCase(authService);
    const logoutUseCase = new LogoutUseCase(authService);
    const registerUseCase = new RegisterUseCase(authService);

    const controller = new AuthController(
      loginUseCase,
      logoutUseCase,
      registerUseCase,
    );
    const mockRes = createMockResponse();

    const req = {
      headers: { authorization: 'Bearer token-xyz' },
    } as any;

    const result = await controller.logout(req, mockRes);

    expect(result.message).toBe('Logged out successfully');
    expect(authService.signOut).toHaveBeenCalledWith('token-xyz');
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'better-auth.session_token',
      { path: '/' },
    );
  });

  it('getProfile returns user profile with role for authenticated user', () => {
    const controller = new AuthController(
      {} as any,
      {} as any,
      {} as any,
    );

    const profile = controller.getProfile(dummyUser);

    expect(profile.id).toBe('usr-1');
    expect(profile.name).toBe('Director Comercial');
    expect(profile.email).toBe('director@cmp.com');
    expect(profile.role).toBe(UserRole.Director);
  });
});
