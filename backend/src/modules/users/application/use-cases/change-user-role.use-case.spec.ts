import { describe, expect, it, vi } from 'vitest';
import { ChangeUserRoleUseCase } from './change-user-role.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

describe('ChangeUserRoleUseCase', () => {
  const dummyAdvisor = new User({
    id: 'user-advisor',
    name: 'Advisor User',
    email: 'advisor@example.com',
    role: UserRole.Advisor,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const dummyAdmin = new User({
    id: 'user-admin',
    name: 'Admin User',
    email: 'admin@example.com',
    role: UserRole.Admin,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('changes user role successfully when not violating admin protection', async () => {
    const updatedUser = new User({
      id: 'user-advisor',
      name: 'Advisor User',
      email: 'advisor@example.com',
      role: UserRole.Director,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyAdvisor),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn().mockResolvedValue(2),
      update: vi.fn().mockResolvedValue(updatedUser),
    };

    const useCase = new ChangeUserRoleUseCase(userRepository);
    const result = await useCase.execute({
      id: 'user-advisor',
      role: UserRole.Director,
    });

    expect(result.role).toBe(UserRole.Director);
    expect(userRepository.update).toHaveBeenCalledWith('user-advisor', {
      role: UserRole.Director,
    });
  });

  it('allows changing admin role if more than 1 active admin exists', async () => {
    const updatedAdmin = new User({
      id: 'user-admin',
      name: 'Admin User',
      email: 'admin@example.com',
      role: UserRole.Director,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyAdmin),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn().mockResolvedValue(2),
      update: vi.fn().mockResolvedValue(updatedAdmin),
    };

    const useCase = new ChangeUserRoleUseCase(userRepository);
    const result = await useCase.execute({
      id: 'user-admin',
      role: UserRole.Director,
    });

    expect(result.role).toBe(UserRole.Director);
  });

  it('CA-08: throws ConflictError when attempting to demote the last active admin', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyAdmin),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn().mockResolvedValue(1),
      update: vi.fn(),
    };

    const useCase = new ChangeUserRoleUseCase(userRepository);

    await expect(
      useCase.execute({
        id: 'user-admin',
        role: UserRole.Advisor,
      }),
    ).rejects.toThrow(ConflictError);

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('throws ValidationError for invalid role', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyAdvisor),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new ChangeUserRoleUseCase(userRepository);

    await expect(
      useCase.execute({
        id: 'user-advisor',
        role: 'SUPER_USER' as unknown as UserRole,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when user does not exist', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new ChangeUserRoleUseCase(userRepository);

    await expect(
      useCase.execute({
        id: 'non-existent',
        role: UserRole.Director,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
