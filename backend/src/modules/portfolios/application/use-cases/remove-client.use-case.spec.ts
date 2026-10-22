import { describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import type { CatalogRepository } from '../../../catalogs/domain/repositories/catalog.repository.js';
import { ClientPortfolio } from '../../domain/entities/client-portfolio.js';
import type { ClientPortfolioRepository } from '../../domain/repositories/client-portfolio.repository.js';
import { RemoveClientUseCase } from './remove-client.use-case.js';

describe('RemoveClientUseCase', () => {
  const actor = { id: 'usr_admin_1', role: UserRole.Admin };

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
      findAssociation: vi
        .fn()
        .mockResolvedValue(new ClientPortfolio(1, 3, 7)),
      associate: vi.fn(),
      removeAssociation: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function createActivityLogFixture(): ActivityLogPort {
    return { record: vi.fn().mockResolvedValue(undefined) };
  }

  it('removes only the association and registers the activity log', async () => {
    const clientPortfolios = createClientPortfolioRepositoryFixture();
    const activityLog = createActivityLogFixture();
    const useCase = new RemoveClientUseCase(
      createCatalogRepositoryFixture(),
      clientPortfolios,
      activityLog,
    );

    await useCase.execute({ actor, portfolioId: 3, clientId: 7 });

    expect(clientPortfolios.removeAssociation).toHaveBeenCalledWith(3, 7);
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client.portfolio_removed',
        userId: 'usr_admin_1',
        clientId: 7,
      }),
    );
  });

  it('removes the association of a deactivated portfolio', async () => {
    const catalogs = createCatalogRepositoryFixture();
    catalogs.findById = vi.fn().mockResolvedValue({
      id: 3,
      name: 'Portafolio Andino',
      active: false,
    });
    const clientPortfolios = createClientPortfolioRepositoryFixture();
    const useCase = new RemoveClientUseCase(
      catalogs,
      clientPortfolios,
      createActivityLogFixture(),
    );

    await useCase.execute({ actor, portfolioId: 3, clientId: 7 });

    expect(clientPortfolios.removeAssociation).toHaveBeenCalledWith(3, 7);
  });

  it('throws NotFoundError when the portfolio does not exist', async () => {
    const catalogs = createCatalogRepositoryFixture();
    catalogs.findById = vi.fn().mockResolvedValue(null);
    const clientPortfolios = createClientPortfolioRepositoryFixture();
    const useCase = new RemoveClientUseCase(
      catalogs,
      clientPortfolios,
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, portfolioId: 999, clientId: 7 }),
    ).rejects.toThrow(NotFoundError);
    expect(clientPortfolios.removeAssociation).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the client is not associated to the portfolio', async () => {
    const clientPortfolios = createClientPortfolioRepositoryFixture({
      findAssociation: vi.fn().mockResolvedValue(null),
    });
    const useCase = new RemoveClientUseCase(
      createCatalogRepositoryFixture(),
      clientPortfolios,
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, portfolioId: 3, clientId: 7 }),
    ).rejects.toThrow(NotFoundError);
    expect(clientPortfolios.removeAssociation).not.toHaveBeenCalled();
  });
});
