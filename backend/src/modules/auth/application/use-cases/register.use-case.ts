import {
  AuthServicePort,
  LoginResult,
  SignUpParams,
} from '../../domain/ports/auth-service.port.js';
import { UserRole } from '../../domain/types/user-role.enum.js';
import { ValidationError } from '../../../../shared/domain/errors/index.js';

export class RegisterUseCase {
  constructor(private readonly authService: AuthServicePort) {}

  async execute(params: SignUpParams): Promise<LoginResult> {
    if (!params.email || !params.password || !params.name) {
      throw new ValidationError('Name, email and password are required');
    }

    const role = params.role ?? UserRole.Advisor;
    return this.authService.signUpEmail({
      ...params,
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      role,
    });
  }
}
