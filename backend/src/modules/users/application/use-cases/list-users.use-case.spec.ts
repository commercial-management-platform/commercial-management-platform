import { describe, expect, it, vi } from 'vitest';
import { ListUsersUseCase } from './list-users.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

describe('ListUsersUseCase', () => {
  const adminActor = { id: 'admin-1', role: UserRole.Admin };
  const directorActor = { id: 'director-1', role: UserRole.Director };
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
    const result = await useCase.execute(undefined, adminActor);

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
    await useCase.execute(filters, adminActor);

    expect(userRepository.findAll).toHaveBeenCalledWith(filters);
  });

  it('limits directors to advisors and returns an empty list for other role filters', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };
    const useCase = new ListUsersUseCase(userRepository);

    await useCase.execute(undefined, directorActor);
    expect(userRepository.findAll).toHaveBeenLastCalledWith({ role: UserRole.Advisor });

    const result = await useCase.execute({ role: UserRole.Admin }, directorActor);
    expect(result).toEqual([]);
    expect(userRepository.findAll).toHaveBeenCalledTimes(1);
  });
});
