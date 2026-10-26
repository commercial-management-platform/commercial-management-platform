import { describe, expect, it, vi } from 'vitest';
import { UsersController } from './users.controller.js';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js';
import { GetUserUseCase } from '../application/use-cases/get-user.use-case.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js';
import { ChangeUserRoleUseCase } from '../application/use-cases/change-user-role.use-case.js';
import { SetUserStatusUseCase } from '../application/use-cases/set-user-status.use-case.js';
import { User } from '../domain/entities/user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { ValidationError } from '../../../shared/domain/errors/index.js';

describe('UsersController', () => {
  const actor = new AuthUser({
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: UserRole.Admin,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const dummyUser = new User({
    id: 'user-1',
    name: 'Carlos Mendoza',
    email: 'carlos@cmp.com',
    role: UserRole.Advisor,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockListUsersUseCase = {
    execute: vi.fn().mockResolvedValue([dummyUser]),
  } as unknown as ListUsersUseCase;

  const mockGetUserUseCase = {
    execute: vi.fn().mockResolvedValue(dummyUser),
  } as unknown as GetUserUseCase;

  const mockCreateUserUseCase = {
    execute: vi.fn().mockResolvedValue(dummyUser),
  } as unknown as CreateUserUseCase;

  const mockUpdateUserUseCase = {
    execute: vi.fn().mockResolvedValue(dummyUser),
  } as unknown as UpdateUserUseCase;

  const mockChangeUserRoleUseCase = {
    execute: vi.fn().mockResolvedValue(dummyUser),
  } as unknown as ChangeUserRoleUseCase;

  const mockSetUserStatusUseCase = {
    execute: vi.fn().mockResolvedValue(dummyUser),
  } as unknown as SetUserStatusUseCase;

  function createController(): UsersController {
    return new UsersController(
      mockListUsersUseCase,
      mockGetUserUseCase,
      mockCreateUserUseCase,
      mockUpdateUserUseCase,
      mockChangeUserRoleUseCase,
      mockSetUserStatusUseCase,
    );
  }

  it('listUsers returns array of UserResponseDto', async () => {
    const controller = createController();
    const result = await controller.listUsers(
      { role: 'ASESOR', isActive: true },
      actor,
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('user-1');
    expect(mockListUsersUseCase.execute).toHaveBeenCalledWith({
      role: UserRole.Advisor,
      isActive: true,
      search: undefined,
    }, { id: actor.id, role: actor.role });
  });

  it('createUser normalizes Spanish role and creates user', async () => {
    const controller = createController();
    const result = await controller.createUser({
      name: 'Carlos Mendoza',
      email: 'carlos@cmp.com',
      password: 'StrongPassword123!',
      role: 'GERENTE',
    }, actor);

    expect(result.id).toBe('user-1');
    expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith({
      actor: { id: actor.id, role: actor.role },
      name: 'Carlos Mendoza',
      email: 'carlos@cmp.com',
      password: 'StrongPassword123!',
      role: UserRole.Director,
    });
  });

  it('createUser throws ValidationError for invalid role string', async () => {
    const controller = createController();

    await expect(
      controller.createUser({
        name: 'Carlos Mendoza',
        email: 'carlos@cmp.com',
        password: 'StrongPassword123!',
        role: 'SUPERADMIN',
      }, actor),
    ).rejects.toThrow(ValidationError);
  });

  it('getUser returns UserResponseDto by id', async () => {
    const controller = createController();
    const result = await controller.getUser('user-1', actor);

    expect(result.id).toBe('user-1');
    expect(mockGetUserUseCase.execute).toHaveBeenCalledWith('user-1', {
      id: actor.id,
      role: actor.role,
    });
  });

  it('updateUser updates allowed profile fields', async () => {
    const controller = createController();
    const result = await controller.updateUser('user-1', {
      name: 'Carlos Mendoza Updated',
    }, actor);

    expect(result.id).toBe('user-1');
    expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith({
      actor: { id: actor.id, role: actor.role },
      id: 'user-1',
      name: 'Carlos Mendoza Updated',
      image: undefined,
    });
  });

  it('changeRole changes user role with parsed role', async () => {
    const controller = createController();
    const result = await controller.changeRole('user-1', {
      role: 'ADMINISTRADOR',
    });

    expect(result.id).toBe('user-1');
    expect(mockChangeUserRoleUseCase.execute).toHaveBeenCalledWith({
      id: 'user-1',
      role: UserRole.Admin,
    });
  });

  it('setStatus updates active status of user', async () => {
    const controller = createController();
    const result = await controller.setStatus('user-1', {
      isActive: false,
    }, actor);

    expect(result.id).toBe('user-1');
    expect(mockSetUserStatusUseCase.execute).toHaveBeenCalledWith({
      actor: { id: actor.id, role: actor.role },
      id: 'user-1',
      isActive: false,
    });
  });
});
