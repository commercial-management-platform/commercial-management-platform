import { describe, expect, it, vi } from 'vitest';
import { GetUserUseCase } from './get-user.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';

describe('GetUserUseCase', () => {
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

  it('returns a user when found by id', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyUser),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new GetUserUseCase(userRepository);
    const result = await useCase.execute('user-1', { id: 'admin-1', role: UserRole.Admin });

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('admin@example.com');
    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws NotFoundError when user does not exist', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new GetUserUseCase(userRepository);

    await expect(useCase.execute('non-existent', { id: 'admin-1', role: UserRole.Admin })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('hides non-advisor accounts from directors', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyUser),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };
    const useCase = new GetUserUseCase(userRepository);

    await expect(
      useCase.execute('user-1', { id: 'director-1', role: UserRole.Director }),
    ).rejects.toThrow(NotFoundError);
  });
});
