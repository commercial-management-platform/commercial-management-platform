import { describe, expect, it, vi } from 'vitest';
import { ChangeUserRoleUseCase } from './change-user-role.use-case.js';
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

    const useCase = new ChangeUserRoleUseCase(
      userRepository,
      createAdvisorProfiles(),
    );
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

    const useCase = new ChangeUserRoleUseCase(
      userRepository,
      createAdvisorProfiles(),
    );
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

    const useCase = new ChangeUserRoleUseCase(
      userRepository,
      createAdvisorProfiles(),
    );

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

    const useCase = new ChangeUserRoleUseCase(
      userRepository,
      createAdvisorProfiles(),
    );

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

    const useCase = new ChangeUserRoleUseCase(
      userRepository,
      createAdvisorProfiles(),
    );

    await expect(
      useCase.execute({
        id: 'non-existent',
        role: UserRole.Director,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  describe('advisor record', () => {
    const asDirector = copyUser(dummyAdvisor, { role: UserRole.Director });

    it('creates or reactivates the advisor record when the role changes to advisor', async () => {
      const director = copyUser(dummyAdvisor, { role: UserRole.Director });
      const userRepository: UserRepository = {
        findAll: vi.fn(),
        findById: vi.fn().mockResolvedValue(director),
        findByEmail: vi.fn(),
        countActiveAdmins: vi.fn(),
        update: vi.fn().mockResolvedValue(dummyAdvisor),
      };
      const advisorProfiles = createAdvisorProfiles();

      await new ChangeUserRoleUseCase(userRepository, advisorProfiles).execute({
        id: 'user-advisor',
        role: UserRole.Advisor,
      });

      expect(advisorProfiles.save).toHaveBeenCalledWith({
        userId: 'user-advisor',
        name: 'Advisor User',
        email: 'advisor@example.com',
        status: AdvisorStatus.Active,
      });
      expect(advisorProfiles.deactivate).not.toHaveBeenCalled();
    });

    it('leaves the advisor record inactive when an advisor gets another role', async () => {
      const userRepository: UserRepository = {
        findAll: vi.fn(),
        findById: vi.fn().mockResolvedValue(dummyAdvisor),
        findByEmail: vi.fn(),
        countActiveAdmins: vi.fn(),
        update: vi.fn().mockResolvedValue(asDirector),
      };
      const advisorProfiles = createAdvisorProfiles();

      await new ChangeUserRoleUseCase(userRepository, advisorProfiles).execute({
        id: 'user-advisor',
        role: UserRole.Director,
      });

      expect(advisorProfiles.deactivate).toHaveBeenCalledWith('user-advisor');
      expect(advisorProfiles.save).not.toHaveBeenCalled();
    });
  });
});
