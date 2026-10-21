import { describe, expect, it, vi } from 'vitest';
import { SetUserStatusUseCase } from './set-user-status.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User, UserProps } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import {
  AdvisorProfilePort,
  AdvisorStatus,
} from '../ports/advisor-profile.port.js';

function createAdvisorProfiles(): AdvisorProfilePort {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    deactivate: vi.fn().mockResolvedValue(undefined),
  };
}

function copyUser(user: User, changes: Partial<UserProps>): User {
  return new User({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...changes,
  });
}

describe('SetUserStatusUseCase', () => {
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

  it('deactivates an advisor account successfully', async () => {
    const deactivatedUser = new User({
      id: 'user-advisor',
      name: 'Advisor User',
      email: 'advisor@example.com',
      role: UserRole.Advisor,
      isActive: false,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyAdvisor),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn().mockResolvedValue(deactivatedUser),
    };

    const useCase = new SetUserStatusUseCase(
      userRepository,
      createAdvisorProfiles(),
    );
    const result = await useCase.execute({
      id: 'user-advisor',
      isActive: false,
    });

    expect(result.isActive).toBe(false);
    expect(userRepository.update).toHaveBeenCalledWith('user-advisor', {
      isActive: false,
    });
  });

  it('allows deactivating admin if more than 1 active admin exists', async () => {
    const deactivatedAdmin = new User({
      id: 'user-admin',
      name: 'Admin User',
      email: 'admin@example.com',
      role: UserRole.Admin,
      isActive: false,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyAdmin),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn().mockResolvedValue(2),
      update: vi.fn().mockResolvedValue(deactivatedAdmin),
    };

    const useCase = new SetUserStatusUseCase(
      userRepository,
      createAdvisorProfiles(),
    );
    const result = await useCase.execute({
      id: 'user-admin',
      isActive: false,
    });

    expect(result.isActive).toBe(false);
  });

  it('CA-08: throws ConflictError when attempting to deactivate the last active admin', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyAdmin),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn().mockResolvedValue(1),
      update: vi.fn(),
    };

    const useCase = new SetUserStatusUseCase(
      userRepository,
      createAdvisorProfiles(),
    );

    await expect(
      useCase.execute({
        id: 'user-admin',
        isActive: false,
      }),
    ).rejects.toThrow(ConflictError);

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('allows activating an already inactive admin without error', async () => {
    const inactiveAdmin = new User({
      id: 'user-admin-2',
      name: 'Admin 2',
      email: 'admin2@example.com',
      role: UserRole.Admin,
      isActive: false,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const activatedAdmin = new User({
      id: 'user-admin-2',
      name: 'Admin 2',
      email: 'admin2@example.com',
      role: UserRole.Admin,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(inactiveAdmin),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn().mockResolvedValue(1),
      update: vi.fn().mockResolvedValue(activatedAdmin),
    };

    const useCase = new SetUserStatusUseCase(
      userRepository,
      createAdvisorProfiles(),
    );
    const result = await useCase.execute({
      id: 'user-admin-2',
      isActive: true,
    });

    expect(result.isActive).toBe(true);
  });

  it('throws NotFoundError when user does not exist', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new SetUserStatusUseCase(
      userRepository,
      createAdvisorProfiles(),
    );

    await expect(
      useCase.execute({
        id: 'non-existent',
        isActive: false,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  describe('advisor record', () => {
    const activeAdvisor = new User({
      id: 'user-advisor',
      name: 'Advisor User',
      email: 'advisor@example.com',
      role: UserRole.Advisor,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('marks the advisor record inactive when the account is deactivated', async () => {
      const userRepository: UserRepository = {
        findAll: vi.fn(),
        findById: vi.fn().mockResolvedValue(activeAdvisor),
        findByEmail: vi.fn(),
        countActiveAdmins: vi.fn(),
        update: vi
          .fn()
          .mockResolvedValue(copyUser(activeAdvisor, { isActive: false })),
      };
      const advisorProfiles = createAdvisorProfiles();

      await new SetUserStatusUseCase(userRepository, advisorProfiles).execute({
        id: 'user-advisor',
        isActive: false,
      });

      expect(advisorProfiles.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-advisor',
          status: AdvisorStatus.Inactive,
        }),
      );
    });
  });
});
