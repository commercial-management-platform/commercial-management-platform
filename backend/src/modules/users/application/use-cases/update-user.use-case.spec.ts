import { describe, expect, it, vi } from 'vitest';
import { UpdateUserUseCase } from './update-user.use-case.js';
import { UserRepository } from '../../domain/ports/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

describe('UpdateUserUseCase', () => {
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

    const useCase = new UpdateUserUseCase(userRepository);
    const result = await useCase.execute({
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

  it('throws ValidationError for empty name', async () => {
    const userRepository: UserRepository = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(dummyUser),
      findByEmail: vi.fn(),
      countActiveAdmins: vi.fn(),
      update: vi.fn(),
    };

    const useCase = new UpdateUserUseCase(userRepository);

    await expect(
      useCase.execute({ id: 'user-1', name: '   ' }),
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

    const useCase = new UpdateUserUseCase(userRepository);

    await expect(
      useCase.execute({ id: 'non-existent', name: 'Valid Name' }),
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

    const useCase = new UpdateUserUseCase(userRepository);

    await expect(useCase.execute({ id: 'user-1' })).rejects.toThrow(
      ValidationError,
    );
  });
});
