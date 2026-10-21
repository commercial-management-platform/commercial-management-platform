import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import { Client, type ClientProps } from '../../domain/entities/client.js';
import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import type { ActivityLogPort } from '../ports/activity-log.port.js';
import type { CatalogValidatorPort } from '../ports/catalog-validator.port.js';
import { CreateClientUseCase } from './create-client.use-case.js';

describe('CreateClientUseCase', () => {
  const actor = { id: 'usr_admin_1', role: UserRole.Admin };

  const baseProps: ClientProps = {
    id: null,
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
    createdAt: null,
    updatedAt: null,
  };

  function createRepositoryFixture(
    overrides: Partial<ClientRepository> = {},
  ): ClientRepository {
    return {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      findByNit: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockImplementation(
        async (client: Client) =>
          new Client({
            ...client,
            id: 1,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          }),
      ),
      update: vi.fn(),
      ...overrides,
    };
  }

  function createCatalogFixture(
    exists: (catalog: string, id: number) => Promise<boolean> = async () =>
      true,
  ): CatalogValidatorPort {
    return { exists: vi.fn().mockImplementation(exists) };
  }

  function createActivityLogFixture(): ActivityLogPort {
    return { record: vi.fn().mockResolvedValue(undefined) };
  }

  it('creates a valid client with active state and registers the activity log', async () => {
    const repository = createRepositoryFixture();
    const catalogs = createCatalogFixture();
    const activityLog = createActivityLogFixture();
    const useCase = new CreateClientUseCase(repository, catalogs, activityLog);

    const client = await useCase.execute({
      actor,
      nit: ' 900123456-5 ',
      businessName: ' Distribuidora Andina SAS ',
      email: 'compras@distribuidoraandina.co',
      latitude: 4.711,
      longitude: -74.0721,
    });

    expect(client.id).toBe(1);
    expect(client.nit).toBe('900123456-5');
    expect(client.businessName).toBe('Distribuidora Andina SAS');
    expect(client.active).toBe(true);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client.created',
        userId: 'usr_admin_1',
        clientId: 1,
      }),
    );
  });

  it('throws ValidationError when nit or businessName is missing', async () => {
    const useCase = new CreateClientUseCase(
      createRepositoryFixture(),
      createCatalogFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, nit: '', businessName: 'Andina' }),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute({ actor, nit: '900123456-5', businessName: '' }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError for an invalid NIT format', async () => {
    const repository = createRepositoryFixture();
    const useCase = new CreateClientUseCase(
      repository,
      createCatalogFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, nit: '12345', businessName: 'Andina' }),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute({ actor, nit: 'NIT-ABC', businessName: 'Andina' }),
    ).rejects.toThrow(ValidationError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('throws ConflictError when the NIT already exists', async () => {
    const repository = createRepositoryFixture({
      findByNit: vi.fn().mockResolvedValue(new Client(baseProps)),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new CreateClientUseCase(
      repository,
      createCatalogFixture(),
      activityLog,
    );

    await expect(
      useCase.execute({ actor, nit: '900123456-5', businessName: 'Andina' }),
    ).rejects.toThrow(ConflictError);
    expect(repository.save).not.toHaveBeenCalled();
    expect(activityLog.record).not.toHaveBeenCalled();
  });

  it('throws ValidationError when a catalog id is not valid', async () => {
    const repository = createRepositoryFixture();
    const catalogs = createCatalogFixture(async (catalog, id) => {
      // Simulates HU-05: only zone 1 exists.
      return !(catalog === 'zone' && id !== 1);
    });
    const useCase = new CreateClientUseCase(
      repository,
      catalogs,
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor,
        nit: '900123456-5',
        businessName: 'Andina',
        zoneId: 999,
      }),
    ).rejects.toThrow(ValidationError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('does not validate catalogs that are not provided', async () => {
    const repository = createRepositoryFixture();
    const catalogs = createCatalogFixture();
    const useCase = new CreateClientUseCase(
      repository,
      catalogs,
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor,
      nit: '900123456-5',
      businessName: 'Andina',
    });

    expect(catalogs.exists).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
