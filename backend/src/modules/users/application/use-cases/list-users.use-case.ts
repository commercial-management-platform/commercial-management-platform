import {
  UserRepository,
  UserFilterOptions,
} from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(options?: UserFilterOptions): Promise<User[]> {
    return this.userRepository.findAll(options);
  }
}
