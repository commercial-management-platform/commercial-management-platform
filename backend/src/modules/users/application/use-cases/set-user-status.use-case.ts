import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { AdvisorProfilePort } from '../ports/advisor-profile.port.js';
import { syncAdvisorProfile } from '../advisor-profile.sync.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { UserActor } from '../types/user-actor.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

export interface SetUserStatusCommand {
  actor: UserActor;
  id: string;
  isActive: boolean;
}

export class SetUserStatusUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly advisorProfiles: AdvisorProfilePort,
  ) {}

  async execute(command: SetUserStatusCommand): Promise<User> {
    if (!command.id || command.id.trim().length === 0) {
      throw new ValidationError('User id is required');
    }

    if (typeof command.isActive !== 'boolean') {
      throw new ValidationError('isActive must be a boolean');
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

    // CA-08: Prevent deactivating the last active administrator
    if (existingUser.isActiveAdmin() && command.isActive === false) {
      const activeAdminsCount = await this.userRepository.countActiveAdmins();
      if (activeAdminsCount <= 1) {
        throw new ConflictError(
          'Cannot deactivate the last active administrator',
        );
      }
    }

    const updatedUser = await this.userRepository.update(command.id, {
      isActive: command.isActive,
    });

    // Deactivating an advisor leaves its record inactive instead of deleting it.
    await syncAdvisorProfile(this.advisorProfiles, updatedUser);

    return updatedUser;
  }
}
