import {
  AuthServicePort,
  LoginResult,
} from '../../domain/ports/auth-service.port.js';
import { UnauthorizedError } from '../../../../shared/domain/errors/index.js';

export interface LoginInput {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(private readonly authService: AuthServicePort) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    if (!input.email || !input.password) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const result = await this.authService.signInEmail(
      normalizedEmail,
      input.password,
    );

    if (result.user.banned) {
      throw new UnauthorizedError('Account is suspended');
    }

    return result;
  }
}
