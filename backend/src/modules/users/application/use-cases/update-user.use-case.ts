import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { AdvisorProfilePort } from '../ports/advisor-profile.port.js';
import { syncAdvisorProfile } from '../advisor-profile.sync.js';
import type { UserActor } from '../types/user-actor.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

export interface UpdateUserCommand {
  actor: UserActor;
  id: string;
  name?: string;
  image?: string | null;
}

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly advisorProfiles: AdvisorProfilePort,
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    if (!command.id || command.id.trim().length === 0) {
      throw new ValidationError('User id is required');
    }

    if (command.name === undefined && command.image === undefined) {
      throw new ValidationError(
        'At least one field (name or image) must be provided to update',
      );
    }

    if (command.name !== undefined && command.name.trim().length === 0) {
      throw new ValidationError('Name cannot be empty');
    }

    const existingUser = await this.userRepository.findById(command.id);
    if (!existingUser) {
      throw new NotFoundError(`User with id '${command.id}' not found`);
    }
    if (
      command.actor.role === UserRole.Director &&
      existingUser.role !== UserRole.Advisor
    ) {
      throw new NotFoundError(`User with id '${command.id}' not found`);
    }

    const updatedUser = await this.userRepository.update(command.id, {
      name: command.name?.trim(),
      image: command.image,
    });
    await syncAdvisorProfile(this.advisorProfiles, updatedUser);
    return updatedUser;
  }
}
