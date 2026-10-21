import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { AuthServicePort } from '../../../auth/domain/ports/auth-service.port.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

export interface CreateUserCommand {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthServicePort,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    this.validate(command);

    const existingUser = await this.userRepository.findByEmail(
      command.email.toLowerCase(),
    );
    if (existingUser) {
      throw new ConflictError(
        `User with email '${command.email}' already exists`,
      );
    }

    const result = await this.authService.signUpEmail({
      name: command.name.trim(),
      email: command.email.toLowerCase().trim(),
      password: command.password,
      role: command.role,
    });

    const user = await this.userRepository.findById(result.user.id);
    if (user) {
      return user;
    }

    return new User({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      isActive: true,
      emailVerified: result.user.emailVerified,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
    });
  }

  private validate(command: CreateUserCommand): void {
    if (!command.name || command.name.trim().length === 0) {
      throw new ValidationError('User name is required');
    }

    if (!command.email || !EMAIL_REGEX.test(command.email.trim())) {
      throw new ValidationError('A valid email address is required');
    }

    if (!command.password || command.password.length < 8) {
      throw new ValidationError(
        'Password must be at least 8 characters long',
      );
    }

    if (!Object.values(UserRole).includes(command.role)) {
      throw new ValidationError(`Invalid role: ${command.role}`);
    }
  }
}
