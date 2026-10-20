import { AuthServicePort } from '../../domain/ports/auth-service.port.js';

export class LogoutUseCase {
  constructor(private readonly authService: AuthServicePort) {}

  async execute(token: string): Promise<void> {
    if (!token) {
      return;
    }
    await this.authService.signOut(token);
  }
}
