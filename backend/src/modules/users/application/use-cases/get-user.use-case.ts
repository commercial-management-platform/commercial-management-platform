import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { UserActor } from '../types/user-actor.js';

export class GetUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string, actor: UserActor): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }
    if (actor.role === UserRole.Director && user.role !== UserRole.Advisor) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }
    return user;
  }
}
