import { describe, expect, it, vi } from 'vitest';
import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { ChangeClientStatusUseCase } from '../application/use-cases/change-client-status.use-case.js';
import { CreateClientUseCase } from '../application/use-cases/create-client.use-case.js';
import { GetClientByIdUseCase } from '../application/use-cases/get-client-by-id.use-case.js';
import { ListClientsUseCase } from '../application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from '../application/use-cases/update-client.use-case.js';
import { Client } from '../domain/entities/client.js';
import { ClientsController } from './clients.controller.js';
import type { CreateClientDto } from './dtos/create-client.dto.js';
import type { UpdateClientDto } from './dtos/update-client.dto.js';

describe('ClientsController', () => {
  const adminUser = new AuthUser({
    id: 'usr_admin_1',
    email: 'admin@cmp.com',
    name: 'Admin User',
    role: UserRole.Admin,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const client = new Client({
    id: 1,
    nit: '900123456-5',
    businessName: 'Distribuidora Andina SAS',
    tradeName: null,
    address: null,
    department: null,
    municipality: null,
    neighborhood: null,
    phone: null,
    email: null,
    zoneId: null,
    clientTypeId: null,
    clientPotentialId: null,
    clientStatusId: null,
    visitFrequencyDays: null,
    latitude: null,
    longitude: null,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  function createController() {
    const create = { execute: vi.fn().mockResolvedValue(client) };
    const list = { execute: vi.fn().mockResolvedValue([client]) };
    const get = { execute: vi.fn().mockResolvedValue(client) };
    const update = { execute: vi.fn().mockResolvedValue(client) };
    const status = { execute: vi.fn().mockResolvedValue(client) };

    const controller = new ClientsController(
      create as unknown as CreateClientUseCase,
      list as unknown as ListClientsUseCase,
      get as unknown as GetClientByIdUseCase,
      update as unknown as UpdateClientUseCase,
      status as unknown as ChangeClientStatusUseCase,
    );

    return { controller, create, list, get, update, status };
  }

  it('create forwards the actor and dto and returns a client response', async () => {
    const { controller, create } = createController();
    const dto = {
      nit: '900123456-5',
      businessName: 'Distribuidora Andina SAS',
    } as CreateClientDto;

    const result = await controller.create(dto, adminUser);

    expect(create.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      nit: '900123456-5',
      businessName: 'Distribuidora Andina SAS',
    });
    expect(result.id).toBe(1);
    expect(result.nit).toBe('900123456-5');
    expect(result.active).toBe(true);
  });

  it('list maps every client to a client response', async () => {
    const { controller, list } = createController();

    const result = await controller.list({}, adminUser);

    expect(list.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
    });
    expect(result).toHaveLength(1);
    expect(result[0].businessName).toBe('Distribuidora Andina SAS');
  });

  it('getById passes the numeric id and the actor', async () => {
    const { controller, get } = createController();

    const result = await controller.getById(1, adminUser);

    expect(get.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 1,
    });
    expect(result.id).toBe(1);
  });

  it('update passes the actor, the id and the data', async () => {
    const { controller, update } = createController();
    const dto = { phone: '6015551234' } as UpdateClientDto;

    await controller.update(1, dto, adminUser);

    expect(update.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 1,
      data: { phone: '6015551234' },
    });
  });

  it('changeStatus passes the active flag and the actor', async () => {
    const { controller, status } = createController();

    const result = await controller.changeStatus(
      1,
      { active: false },
      adminUser,
    );

    expect(status.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 1,
      active: false,
    });
    expect(result.active).toBe(true);
  });
});
