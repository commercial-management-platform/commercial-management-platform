import { describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import { Client, type ClientProps } from '../../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { CatalogRepository } from '../../../catalogs/domain/repositories/catalog.repository.js';
import { ClientPortfolio } from '../../domain/entities/client-portfolio.js';
import type { ClientPortfolioRepository } from '../../domain/repositories/client-portfolio.repository.js';
import { GetPortfolioClientsUseCase } from './get-portfolio-clients.use-case.js';

describe('GetPortfolioClientsUseCase', () => {
  const adminActor = { id: 'usr_admin_1', role: UserRole.Admin };
  const advisorActor = { id: 'usr_advisor_1', role: UserRole.Advisor };

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

  function createCatalogRepositoryFixture(): CatalogRepository {
    return {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi
        .fn()
        .mockResolvedValue({ id: 3, name: 'Portafolio Andino', active: true }),
      findByName: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      setActive: vi.fn(),
    };
  }

  function createClientPortfolioRepositoryFixture(
    associations: ClientPortfolio[] = [],
  ): ClientPortfolioRepository {
    return {
      findByPortfolio: vi.fn().mockResolvedValue(associations),
      findAssociation: vi.fn().mockResolvedValue(null),
      associate: vi.fn(),
      removeAssociation: vi.fn(),
    };
  }

  function createClientRepositoryFixture(
    clients: Client[] = [],
  ): ClientRepository {
    return {
      findAll: vi.fn().mockResolvedValue(clients),
      findById: vi.fn().mockResolvedValue(null),
      findByNit: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      update: vi.fn(),
    };
  }

  function createAdvisorAccessFixture(ids: number[]): AdvisorClientAccessPort {
    return {
      canAccess: vi.fn().mockResolvedValue(ids.includes(7)),
      getAccessibleClientIds: vi.fn().mockResolvedValue(ids),
    };
  }

  it('returns the clients associated to the portfolio', async () => {
    const client = new Client(clientProps);
    const associations = [new ClientPortfolio(1, 3, 7)];
    const clients = createClientRepositoryFixture([client]);
    const useCase = new GetPortfolioClientsUseCase(
      createCatalogRepositoryFixture(),
      createClientPortfolioRepositoryFixture(associations),
      clients,
      createAdvisorAccessFixture([7]),
    );

    const result = await useCase.execute({
      actor: adminActor,
      portfolioId: 3,
    });

    expect(clients.findAll).toHaveBeenCalledWith({ ids: [7] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(7);
  });

  it('returns an empty list when the portfolio has no clients', async () => {
    const clients = createClientRepositoryFixture();
    const useCase = new GetPortfolioClientsUseCase(
      createCatalogRepositoryFixture(),
      createClientPortfolioRepositoryFixture(),
      clients,
      createAdvisorAccessFixture([7]),
    );

    const result = await useCase.execute({
      actor: adminActor,
      portfolioId: 3,
    });

    expect(result).toEqual([]);
    expect(clients.findAll).not.toHaveBeenCalled();
  });

  it('hides the clients that are outside the routes of an advisor', async () => {
    const associations = [
      new ClientPortfolio(1, 3, 7),
      new ClientPortfolio(2, 3, 8),
    ];
    const clients = createClientRepositoryFixture();
    const useCase = new GetPortfolioClientsUseCase(
      createCatalogRepositoryFixture(),
      createClientPortfolioRepositoryFixture(associations),
      clients,
      createAdvisorAccessFixture([7]),
    );

    const result = await useCase.execute({
      actor: advisorActor,
      portfolioId: 3,
    });

    expect(clients.findAll).toHaveBeenCalledWith({ ids: [7] });
    expect(result).toEqual([]);
  });

  it('throws NotFoundError when the portfolio does not exist', async () => {
    const catalogs = createCatalogRepositoryFixture();
    catalogs.findById = vi.fn().mockResolvedValue(null);
    const useCase = new GetPortfolioClientsUseCase(
      catalogs,
      createClientPortfolioRepositoryFixture(),
      createClientRepositoryFixture(),
      createAdvisorAccessFixture([7]),
    );

    await expect(
      useCase.execute({ actor: adminActor, portfolioId: 999 }),
    ).rejects.toThrow(NotFoundError);
  });
});
