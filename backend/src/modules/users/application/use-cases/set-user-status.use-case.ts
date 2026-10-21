import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

export interface SetUserStatusCommand {
  id: string;
  isActive: boolean;
}

export class SetUserStatusUseCase {
  constructor(private readonly userRepository: UserRepository) {}

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

    // CA-08: Prevent deactivating the last active administrator
    if (existingUser.isActiveAdmin() && command.isActive === false) {
      const activeAdminsCount = await this.userRepository.countActiveAdmins();
      if (activeAdminsCount <= 1) {
        throw new ConflictError(
          'Cannot deactivate the last active administrator',
        );
      }
    }

    return this.userRepository.update(command.id, {
      isActive: command.isActive,
    });
  }
}
