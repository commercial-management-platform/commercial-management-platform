import { describe, expect, it, vi } from 'vitest';
import { ListUsersUseCase } from './list-users.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

describe('ListUsersUseCase', () => {
  const dummyUser = new User({
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.Admin,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('returns all users from repository', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn().mockResolvedValue([dummyUser]),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new ListUsersUseCase(userRepository);
    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('user-1');
    expect(userRepository.findAll).toHaveBeenCalledWith(undefined);
  });

  it('passes filter options to repository', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new ListUsersUseCase(userRepository);
    const filters = { role: UserRole.Advisor, isActive: true, search: 'test' };
    await useCase.execute(filters);

    expect(userRepository.findAll).toHaveBeenCalledWith(filters);
  });
});
