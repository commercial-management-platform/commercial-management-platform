import {
  AuthServicePort,
  SessionVerificationResult,
} from '../../domain/ports/auth-service.port.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/index.js';

export class VerifySessionUseCase {
  constructor(private readonly authService: AuthServicePort) {}

  async execute(
    headersOrToken: Record<string, string | string[] | undefined> | string,
  ): Promise<SessionVerificationResult> {
    if (!headersOrToken) {
      throw new UnauthorizedError('No authentication credentials provided');
    }

    const verification = await this.authService.verifySession(headersOrToken);
    if (!verification) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    if (verification.session.isExpired()) {
      throw new UnauthorizedError('Session has expired');
    }

    if (verification.user.banned) {
      throw new UnauthorizedError('Account is suspended');
    }

    return verification;
  }
}
