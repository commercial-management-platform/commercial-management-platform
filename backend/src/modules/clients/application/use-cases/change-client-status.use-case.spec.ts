import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import { Client, type ClientProps } from '../../domain/entities/client.js';
import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import type { ActivityLogPort } from '../ports/activity-log.port.js';
import { ChangeClientStatusUseCase } from './change-client-status.use-case.js';

describe('ChangeClientStatusUseCase', () => {
  const existingProps: ClientProps = {
    id: 7,
    nit: '900123456-5',
    businessName: 'Distribuidora Andina SAS',
    tradeName: 'Andina',
    address: 'Carrera 7 # 72-41',
    department: 'Bogota D.C.',
    municipality: 'Bogota',
    neighborhood: 'Chapinero',
    phone: '6015551234',
    email: 'compras@distribuidoraandina.co',
    zoneId: 1,
    clientTypeId: 2,
    clientPotentialId: 3,
    clientStatusId: 1,
    visitFrequencyDays: 7,
    latitude: 4.711,
    longitude: -74.0721,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  function createRepositoryFixture(
    overrides: Partial<ClientRepository> = {},
  ): ClientRepository {
    return {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(new Client(existingProps)),
      findByNit: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(new Client(existingProps)),
      ...overrides,
    };
  }

  function createActivityLogFixture(): ActivityLogPort {
    return { record: vi.fn().mockResolvedValue(undefined) };
  }

  it('deactivates a client and registers the status change', async () => {
    const repository = createRepositoryFixture({
      update: vi
        .fn()
        .mockResolvedValue(new Client({ ...existingProps, active: false })),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new ChangeClientStatusUseCase(repository, activityLog);

    const result = await useCase.execute({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      active: false,
    });

    expect(result.active).toBe(false);
    expect(repository.update).toHaveBeenCalledWith(7, { active: false });
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client.status_changed',
        userId: 'usr_admin_1',
        clientId: 7,
        description: expect.stringContaining('deactivated'),
      }),
    );
  });

  it('reactivates a client and registers the status change', async () => {
    const repository = createRepositoryFixture({
      findById: vi
        .fn()
        .mockResolvedValue(new Client({ ...existingProps, active: false })),
      update: vi
        .fn()
        .mockResolvedValue(new Client({ ...existingProps, active: true })),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new ChangeClientStatusUseCase(repository, activityLog);

    const result = await useCase.execute({
      actor: { id: 'usr_director_1', role: UserRole.Director },
      clientId: 7,
      active: true,
    });

    expect(result.active).toBe(true);
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client.status_changed',
        description: expect.stringContaining('reactivated'),
      }),
    );
  });

  it('throws NotFoundError when the client does not exist', async () => {
    const repository = createRepositoryFixture({
      findById: vi.fn().mockResolvedValue(null),
    });
    const useCase = new ChangeClientStatusUseCase(
      repository,
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_admin_1', role: UserRole.Admin },
        clientId: 404,
        active: false,
      }),
    ).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('only touches the active flag so the commercial history is preserved', async () => {
    const repository = createRepositoryFixture();
    const useCase = new ChangeClientStatusUseCase(
      repository,
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      active: false,
    });

    // Deactivation is a soft delete: only { active } is written, no other
    // field of the client (nor any related record) is modified or removed.
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(7, { active: false });
    expect(repository.save).not.toHaveBeenCalled();
  });
});
