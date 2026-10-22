import { describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import { Client, type ClientProps } from '../../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { CatalogRepository } from '../../../catalogs/domain/repositories/catalog.repository.js';
import { ClientPortfolio } from '../../domain/entities/client-portfolio.js';
import type { ClientPortfolioRepository } from '../../domain/repositories/client-portfolio.repository.js';
import { AssociateClientUseCase } from './associate-client.use-case.js';

describe('AssociateClientUseCase', () => {
  const actor = { id: 'usr_admin_1', role: UserRole.Admin };

  const clientProps: ClientProps = {
    id: 7,
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
  };

  function createCatalogRepositoryFixture(
    overrides: Partial<CatalogRepository> = {},
  ): CatalogRepository {
    return {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi
        .fn()
        .mockResolvedValue({ id: 3, name: 'Portafolio Andino', active: true }),
      findByName: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      setActive: vi.fn(),
      ...overrides,
    };
  }

  function createClientPortfolioRepositoryFixture(
    overrides: Partial<ClientPortfolioRepository> = {},
  ): ClientPortfolioRepository {
    return {
      findByPortfolio: vi.fn().mockResolvedValue([]),
      findAssociation: vi.fn().mockResolvedValue(null),
      associate: vi
        .fn()
        .mockResolvedValue(new ClientPortfolio(1, 3, 7)),
      removeAssociation: vi.fn(),
      ...overrides,
    };
  }

  function createClientRepositoryFixture(
    overrides: Partial<ClientRepository> = {},
  ): ClientRepository {
    return {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(new Client(clientProps)),
      findByNit: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      update: vi.fn(),
      ...overrides,
    };
  }

  function createActivityLogFixture(): ActivityLogPort {
    return { record: vi.fn().mockResolvedValue(undefined) };
  }

  it('associates the client to the portfolio and registers the activity log', async () => {
    const clientPortfolios = createClientPortfolioRepositoryFixture();
    const activityLog = createActivityLogFixture();
    const useCase = new AssociateClientUseCase(
      createCatalogRepositoryFixture(),
      clientPortfolios,
      createClientRepositoryFixture(),
      activityLog,
    );

    await useCase.execute({ actor, portfolioId: 3, clientId: 7 });

    expect(clientPortfolios.associate).toHaveBeenCalledWith(3, 7);
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client.portfolio_added',
        userId: 'usr_admin_1',
        clientId: 7,
      }),
    );
  });

  it('throws NotFoundError when the portfolio does not exist', async () => {
    const catalogs = createCatalogRepositoryFixture();
    catalogs.findById = vi.fn().mockResolvedValue(null);
    const clientPortfolios = createClientPortfolioRepositoryFixture();
    const useCase = new AssociateClientUseCase(
      catalogs,
      clientPortfolios,
      createClientRepositoryFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, portfolioId: 999, clientId: 7 }),
    ).rejects.toThrow(NotFoundError);
    expect(clientPortfolios.associate).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the client does not exist', async () => {
    const clientPortfolios = createClientPortfolioRepositoryFixture();
    const useCase = new AssociateClientUseCase(
      createCatalogRepositoryFixture(),
      clientPortfolios,
      createClientRepositoryFixture({
        findById: vi.fn().mockResolvedValue(null),
      }),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, portfolioId: 3, clientId: 999 }),
    ).rejects.toThrow(NotFoundError);
    expect(clientPortfolios.associate).not.toHaveBeenCalled();
  });

  it('throws ConflictError when the client is already in the portfolio', async () => {
    const clientPortfolios = createClientPortfolioRepositoryFixture({
      findAssociation: vi
        .fn()
        .mockResolvedValue(new ClientPortfolio(1, 3, 7)),
    });
    const useCase = new AssociateClientUseCase(
      createCatalogRepositoryFixture(),
      clientPortfolios,
      createClientRepositoryFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, portfolioId: 3, clientId: 7 }),
    ).rejects.toThrow(ConflictError);
    expect(clientPortfolios.associate).not.toHaveBeenCalled();
  });

  it('refuses a deactivated portfolio with a ValidationError', async () => {
    const catalogs = createCatalogRepositoryFixture();
    catalogs.findById = vi.fn().mockResolvedValue({
      id: 3,
      name: 'Portafolio Andino',
      active: false,
    });
    const clientPortfolios = createClientPortfolioRepositoryFixture();
    const useCase = new AssociateClientUseCase(
      catalogs,
      clientPortfolios,
      createClientRepositoryFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, portfolioId: 3, clientId: 7 }),
    ).rejects.toThrow(ValidationError);
    expect(clientPortfolios.associate).not.toHaveBeenCalled();
  });
});
