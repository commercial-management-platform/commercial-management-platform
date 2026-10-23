import { describe, expect, it, vi } from 'vitest';
import { UpdateUserUseCase } from './update-user.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  AdvisorProfilePort,
  AdvisorStatus,
} from '../ports/advisor-profile.port.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

describe('UpdateUserUseCase', () => {
  const adminActor = { id: 'admin-1', role: UserRole.Admin };
  const directorActor = { id: 'director-1', role: UserRole.Director };
  const advisorProfiles: AdvisorProfilePort = {
    save: vi.fn().mockResolvedValue(undefined),
    deactivate: vi.fn().mockResolvedValue(undefined),
  };
  const dummyUser = new User({
    id: 'user-1',
    name: 'Old Name',
    email: 'user@example.com',
    role: UserRole.Advisor,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('updates allowed user profile fields', async () => {
    const updatedUser = new User({
      id: 'user-1',
      name: 'New Name',
      email: 'user@example.com',
      role: UserRole.Advisor,
      isActive: true,
      emailVerified: true,
      image: 'https://example.com/avatar.jpg',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyUser),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn().mockResolvedValue(updatedUser),
    };

    const useCase = new UpdateUserUseCase(userRepository, advisorProfiles);
    const result = await useCase.execute({
      actor: adminActor,
      id: 'user-1',
      name: 'New Name',
      image: 'https://example.com/avatar.jpg',
    });

    expect(result.name).toBe('New Name');
    expect(result.image).toBe('https://example.com/avatar.jpg');
    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      name: 'New Name',
      image: 'https://example.com/avatar.jpg',
    });
  });

  it('syncs the advisor record with the new name when editing an advisor', async () => {
    const updatedUser = new User({
      id: 'user-1',
      name: 'New Name',
      email: 'user@example.com',
      role: UserRole.Advisor,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyUser),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn().mockResolvedValue(updatedUser),
    };
    const profiles: AdvisorProfilePort = {
      save: vi.fn().mockResolvedValue(undefined),
      deactivate: vi.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateUserUseCase(userRepository, profiles);

    await useCase.execute({ actor: directorActor, id: 'user-1', name: 'New Name' });

    expect(profiles.save).toHaveBeenCalledWith({
      userId: 'user-1',
      name: 'New Name',
      email: 'user@example.com',
      status: AdvisorStatus.Active,
    });
    expect(profiles.deactivate).not.toHaveBeenCalled();
  });

  it.each([UserRole.Admin, UserRole.Director])(
    'only deactivates (never creates) the advisor record when editing a %s',
    async (role) => {
      const user = new User({
        id: 'user-2',
        name: 'Staff Name',
        email: 'staff@example.com',
        role,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const userRepository: UserRepository = {
        findAll: vi.fn(),
        findById: vi.fn().mockResolvedValue(user),
        findByEmail: vi.fn(),
        countActiveAdmins: vi.fn(),
        update: vi.fn().mockResolvedValue(user),
      };
      const profiles: AdvisorProfilePort = {
        save: vi.fn().mockResolvedValue(undefined),
        deactivate: vi.fn().mockResolvedValue(undefined),
      };
      const useCase = new UpdateUserUseCase(userRepository, profiles);

      await useCase.execute({ actor: adminActor, id: 'user-2', name: 'Staff Name' });

      expect(profiles.deactivate).toHaveBeenCalledWith('user-2');
      expect(profiles.save).not.toHaveBeenCalled();
    },
  );

  it('throws ValidationError for empty name', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyUser),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new UpdateUserUseCase(userRepository, advisorProfiles);

    await expect(
      useCase.execute({ actor: adminActor, id: 'user-1', name: '   ' }),
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

    const useCase = new UpdateUserUseCase(userRepository, advisorProfiles);

    await expect(
      useCase.execute({ actor: adminActor, id: 'non-existent', name: 'Valid Name' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when neither name nor image is provided', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new UpdateUserUseCase(userRepository, advisorProfiles);

    await expect(
      useCase.execute({ actor: adminActor, id: 'user-1' }),
    ).rejects.toThrow(ValidationError);
  });

  it('hides non-advisor accounts from directors', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(new User({
        id: dummyUser.id,
        name: dummyUser.name,
        email: dummyUser.email,
        role: UserRole.Admin,
        isActive: dummyUser.isActive,
        emailVerified: dummyUser.emailVerified,
        createdAt: dummyUser.createdAt,
        updatedAt: dummyUser.updatedAt,
      })),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };
    const useCase = new UpdateUserUseCase(userRepository, advisorProfiles);

    await expect(
      useCase.execute({ actor: directorActor, id: 'user-1', name: 'Changed' }),
    ).rejects.toThrow(NotFoundError);
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});
