import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import { Client, type ClientProps } from '../../domain/entities/client.js';
import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import type { ActivityLogPort } from '../ports/activity-log.port.js';
import type { AdvisorClientAccessPort } from '../ports/advisor-client-access.port.js';
import type { CatalogValidatorPort } from '../ports/catalog-validator.port.js';
import { UpdateClientUseCase } from './update-client.use-case.js';

describe('UpdateClientUseCase', () => {
  const existingProps: ClientProps = {
    id: 7,
    nit: '900123456-5',
    businessName: 'Distribuidora Andina SAS',
    tradeName: 'Andina',
    address: null,
    department: null,
    municipality: null,
    neighborhood: null,
    phone: null,
    email: null,
    zoneId: 1,
    clientTypeId: null,
    clientPotentialId: null,
    clientStatusId: null,
    visitFrequencyDays: null,
    latitude: null,
    longitude: null,
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
      findByNit: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(new Client(existingProps)),
      ...overrides,
    };
  }

  function createCatalogFixture(): CatalogValidatorPort {
    return { exists: vi.fn().mockResolvedValue(true) };
  }

  function createAccessFixture(canAccess = true): AdvisorClientAccessPort {
    return {
      canAccess: vi.fn().mockResolvedValue(canAccess),
      getAccessibleClientIds: vi.fn().mockResolvedValue([]),
    };
  }

  function createActivityLogFixture(): ActivityLogPort {
    return { record: vi.fn().mockResolvedValue(undefined) };
  }

  it('updates the allowed fields and registers the activity log', async () => {
    const repository = createRepositoryFixture({
      update: vi
        .fn()
        .mockResolvedValue(
          new Client({ ...existingProps, phone: '6015551234' }),
        ),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new UpdateClientUseCase(
      repository,
      createCatalogFixture(),
      createAccessFixture(),
      activityLog,
    );

    const updated = await useCase.execute({
      actor: { id: 'usr_director_1', role: UserRole.Director },
      clientId: 7,
      data: { phone: '6015551234', tradeName: null },
    });

    expect(updated.phone).toBe('6015551234');
    expect(repository.update).toHaveBeenCalledWith(7, {
      phone: '6015551234',
      tradeName: null,
    });
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client.updated',
        userId: 'usr_director_1',
        clientId: 7,
      }),
    );
  });

  it('trims the new NIT and business name', async () => {
    const repository = createRepositoryFixture({
      update: vi
        .fn()
        .mockResolvedValue(
          new Client({ ...existingProps, nit: '800123456-7' }),
        ),
    });
    const useCase = new UpdateClientUseCase(
      repository,
      createCatalogFixture(),
      createAccessFixture(),
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      data: { nit: ' 800123456-7 ', businessName: '  Nueva Razón  ' },
    });

    expect(repository.update).toHaveBeenCalledWith(7, {
      nit: '800123456-7',
      businessName: 'Nueva Razón',
    });
  });

  it('throws ConflictError when the new NIT belongs to another client', async () => {
    const repository = createRepositoryFixture({
      findByNit: vi
        .fn()
        .mockResolvedValue(new Client({ ...existingProps, id: 8 })),
    });
    const useCase = new UpdateClientUseCase(
      repository,
      createCatalogFixture(),
      createAccessFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_admin_1', role: UserRole.Admin },
        clientId: 7,
        data: { nit: '800123456-7' },
      }),
    ).rejects.toThrow(ConflictError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('allows keeping the current NIT without a duplicate check conflict', async () => {
    const repository = createRepositoryFixture({
      update: vi.fn().mockResolvedValue(new Client(existingProps)),
    });
    const useCase = new UpdateClientUseCase(
      repository,
      createCatalogFixture(),
      createAccessFixture(),
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      data: { nit: '900123456-5', phone: '6015559999' },
    });

    expect(repository.findByNit).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when the client does not exist', async () => {
    const useCase = new UpdateClientUseCase(
      createRepositoryFixture({ findById: vi.fn().mockResolvedValue(null) }),
      createCatalogFixture(),
      createAccessFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_admin_1', role: UserRole.Admin },
        clientId: 404,
        data: { phone: '6015551234' },
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects an advisor updating a client outside their routes with NotFound', async () => {
    const repository = createRepositoryFixture();
    const useCase = new UpdateClientUseCase(
      repository,
      createCatalogFixture(),
      createAccessFixture(false),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
        clientId: 7,
        data: { phone: '6015551234' },
      }),
    ).rejects.toThrow(NotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('lets an advisor update a client on their routes', async () => {
    const repository = createRepositoryFixture({
      update: vi
        .fn()
        .mockResolvedValue(
          new Client({ ...existingProps, phone: '6010000000' }),
        ),
    });
    const access = createAccessFixture(true);
    const useCase = new UpdateClientUseCase(
      repository,
      createCatalogFixture(),
      access,
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
      clientId: 7,
      data: { phone: '6010000000' },
    });

    expect(access.canAccess).toHaveBeenCalledWith('usr_advisor_1', 7);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('throws ValidationError when a catalog id is not valid', async () => {
    const repository = createRepositoryFixture();
    const catalogs: CatalogValidatorPort = {
      exists: vi
        .fn()
        .mockImplementation(
          async (catalog: string, id: number) =>
            !(catalog === 'client_type' && id !== 1),
        ),
    };
    const useCase = new UpdateClientUseCase(
      repository,
      catalogs,
      createAccessFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_admin_1', role: UserRole.Admin },
        clientId: 7,
        data: { clientTypeId: 42 },
      }),
    ).rejects.toThrow(ValidationError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not re-check a catalog id that does not change', async () => {
    const repository = createRepositoryFixture();
    // zone 1 was deactivated after being assigned to the client.
    const catalogs: CatalogValidatorPort = {
      exists: vi.fn().mockResolvedValue(false),
    };
    const useCase = new UpdateClientUseCase(
      repository,
      catalogs,
      createAccessFixture(),
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      data: { zoneId: 1, phone: '6015551234' },
    });

    expect(catalogs.exists).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('ignores fields delivered as explicit undefined (not sent)', async () => {
    const repository = createRepositoryFixture({
      update: vi.fn().mockResolvedValue(new Client(existingProps)),
    });
    const useCase = new UpdateClientUseCase(
      repository,
      createCatalogFixture(),
      createAccessFixture(),
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      data: { phone: '6015551234', nit: undefined, tradeName: undefined },
    });

    const passed = (repository.update as ReturnType<typeof vi.fn>).mock
      .calls[0][1];
    // Only the fields actually sent reach the repository: an explicit
    // undefined must not overwrite the stored nit or trade name.
    expect(Object.keys(passed)).toEqual(['phone']);
  });

  it('rejects an empty NIT or business name', async () => {
    const useCase = new UpdateClientUseCase(
      createRepositoryFixture(),
      createCatalogFixture(),
      createAccessFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_admin_1', role: UserRole.Admin },
        clientId: 7,
        data: { nit: '   ' },
      }),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute({
        actor: { id: 'usr_admin_1', role: UserRole.Admin },
        clientId: 7,
        data: { businessName: '' },
      }),
    ).rejects.toThrow(ValidationError);
  });
});
