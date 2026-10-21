import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

export interface UpdateUserCommand {
  id: string;
  name?: string;
  image?: string | null;
}

export class UpdateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    if (!command.id || command.id.trim().length === 0) {
      throw new ValidationError('User id is required');
    }

    if (command.name !== undefined && command.name.trim().length === 0) {
      throw new ValidationError('Name cannot be empty');
    }

    const existingUser = await this.userRepository.findById(command.id);
    if (!existingUser) {
      throw new NotFoundError(`User with id '${command.id}' not found`);
    }

    return this.userRepository.update(command.id, {
      name: command.name?.trim(),
      image: command.image,
    });
  }
}
