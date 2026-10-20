import { describe, expect, it, vi } from 'vitest';
import { LogoutUseCase } from './logout.use-case.js';
import { AuthServicePort } from '../../domain/ports/auth-service.port.js';

describe('LogoutUseCase', () => {
  it('calls signOut on auth service with session token', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const useCase = new LogoutUseCase(authService);
    await useCase.execute('session-token-123');

    expect(authService.signOut).toHaveBeenCalledWith('session-token-123');
  });

  it('handles empty token gracefully without calling auth service', async () => {
    const authService: AuthServicePort = {
      signInEmail: vi.fn(),
      signOut: vi.fn(),
      verifySession: vi.fn(),
      signUpEmail: vi.fn(),
    };

    const useCase = new LogoutUseCase(authService);
    await useCase.execute('');

    expect(authService.signOut).not.toHaveBeenCalled();
  });
});
