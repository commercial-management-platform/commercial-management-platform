import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { Client, type ClientProps } from '../../domain/entities/client.js';
import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../ports/advisor-client-access.port.js';
import { ListClientsUseCase } from './list-clients.use-case.js';

describe('ListClientsUseCase', () => {
  function makeClient(
    id: number,
    overrides: Partial<ClientProps> = {},
  ): Client {
    return new Client({
      id,
      nit: `90012345${String(id).padStart(3, '0')}`,
      businessName: `Client ${id}`,
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
      ...overrides,
    });
  }

  function createAccessFixture(ids: number[] = []): AdvisorClientAccessPort {
    return {
      canAccess: vi.fn().mockResolvedValue(true),
      getAccessibleClientIds: vi.fn().mockResolvedValue(ids),
    };
  }

  it('admin lists every client without an id scope', async () => {
    const clients = [makeClient(1), makeClient(2)];
    const repository: ClientRepository = {
      findAll: vi.fn().mockResolvedValue(clients),
      findById: vi.fn(),
      findByNit: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };
    const access = createAccessFixture([99]);
    const useCase = new ListClientsUseCase(repository, access);

    const result = await useCase.execute({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
    });

    expect(result).toHaveLength(2);
    const options = (repository.findAll as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(options.ids).toBeUndefined();
    expect(access.getAccessibleClientIds).not.toHaveBeenCalled();
  });

  it('advisor only receives the clients of their routes', async () => {
    const clients = [makeClient(7)];
    const repository: ClientRepository = {
      findAll: vi.fn().mockResolvedValue(clients),
      findById: vi.fn(),
      findByNit: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };
    const access = createAccessFixture([7]);
    const useCase = new ListClientsUseCase(repository, access);

    const result = await useCase.execute({
      actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
    });

    expect(result).toHaveLength(1);
    expect(access.getAccessibleClientIds).toHaveBeenCalledWith('usr_advisor_1');
    const options = (repository.findAll as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(options.ids).toEqual([7]);
  });

  it('advisor without routed clients gets an empty scope', async () => {
    const repository: ClientRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      findByNit: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };
    const useCase = new ListClientsUseCase(repository, createAccessFixture([]));

    const result = await useCase.execute({
      actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
    });

    expect(result).toEqual([]);
    const options = (repository.findAll as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(options.ids).toEqual([]);
  });

  it('passes the list filters through to the repository', async () => {
    const repository: ClientRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      findByNit: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };
    const useCase = new ListClientsUseCase(repository, createAccessFixture());

    await useCase.execute({
      actor: { id: 'usr_director_1', role: UserRole.Director },
      search: 'andina',
      active: true,
      zoneId: 2,
      clientStatusId: 3,
    });

    expect(repository.findAll).toHaveBeenCalledWith({
      search: 'andina',
      active: true,
      zoneId: 2,
      clientTypeId: undefined,
      clientPotentialId: undefined,
      clientStatusId: 3,
    });
  });
});
