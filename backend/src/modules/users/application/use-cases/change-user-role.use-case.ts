import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { AdvisorProfilePort } from '../ports/advisor-profile.port.js';
import { syncAdvisorProfile } from '../advisor-profile.sync.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

export interface ChangeUserRoleCommand {
  id: string;
  role: UserRole;
}

export class ChangeUserRoleUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly advisorProfiles: AdvisorProfilePort,
  ) {}

  async execute(command: ChangeUserRoleCommand): Promise<User> {
    if (!command.id || command.id.trim().length === 0) {
      throw new ValidationError('User id is required');
    }

    if (!Object.values(UserRole).includes(command.role)) {
      throw new ValidationError(`Invalid role: ${command.role}`);
    }

    const existingUser = await this.userRepository.findById(command.id);
    if (!existingUser) {
      throw new NotFoundError(`User with id '${command.id}' not found`);
    }

    // CA-08: Prevent leaving the platform without an active administrator
    if (existingUser.isActiveAdmin() && command.role !== UserRole.Admin) {
      const activeAdminsCount = await this.userRepository.countActiveAdmins();
      if (activeAdminsCount <= 1) {
        throw new ConflictError(
          'Cannot change role: the platform must have at least one active administrator',
        );
      }
    }

    const updatedUser = await this.userRepository.update(command.id, {
      role: command.role,
    });

    // Advisor records are kept (inactive) when the role changes: routes and visits reference them.
    await syncAdvisorProfile(this.advisorProfiles, updatedUser);

    return updatedUser;
  }
}
