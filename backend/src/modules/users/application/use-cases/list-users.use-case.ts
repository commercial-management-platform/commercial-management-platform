import {
  UserRepository,
  UserFilterOptions,
} from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { UserActor } from '../types/user-actor.js';

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(options: UserFilterOptions | undefined, actor: UserActor): Promise<User[]> {
    if (actor.role === UserRole.Director) {
      if (options?.role && options.role !== UserRole.Advisor) {
        return [];
      }
      return this.userRepository.findAll({ ...options, role: UserRole.Advisor });
    }
    return this.userRepository.findAll(options);
  }
}
