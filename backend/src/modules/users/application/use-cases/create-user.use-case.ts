import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import {
  AuthServicePort,
  LoginResult,
} from '../../../auth/domain/ports/auth-service.port.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { UserActor } from '../types/user-actor.js';
import { AdvisorProfilePort } from '../ports/advisor-profile.port.js';
import { syncAdvisorProfile } from '../advisor-profile.sync.js';
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

export interface CreateUserCommand {
  actor: UserActor;
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
    private readonly advisorProfiles: AdvisorProfilePort,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    if (
      command.actor.role === UserRole.Director &&
      command.role !== UserRole.Advisor
    ) {
      throw new ForbiddenError('Directors can only create advisor users');
    }
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

    const user = await this.resolveCreatedUser(command, result);

    if (user.role === UserRole.Advisor) {
      await syncAdvisorProfile(this.advisorProfiles, user);
    }

    return user;
  }

  private async resolveCreatedUser(
    command: CreateUserCommand,
    result: LoginResult,
  ): Promise<User> {
    const id = result.user.id;
    const user = await this.userRepository.findById(id);
    if (user && user.role !== command.role) {
      return this.userRepository.update(id, { role: command.role });
    }

    if (user) {
      return user;
    }

    return new User({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: command.role,
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
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!Object.values(UserRole).includes(command.role)) {
      throw new ValidationError(`Invalid role: ${command.role}`);
    }
  }
}
