import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type {
  CatalogEntry,
  CatalogRepository,
} from '../../../catalogs/domain/repositories/catalog.repository.js';
import { GetPortfolioUseCase } from './get-portfolio.use-case.js';

describe('GetPortfolioUseCase', () => {
  const portfolio: CatalogEntry = {
    id: 3,
    name: 'Portafolio Andino',
    active: true,
    description: 'Clientes del sector andino',
  };

  function createCatalogRepositoryFixture(
    overrides: Partial<CatalogRepository> = {},
  ): CatalogRepository {
    return {
      findAll: vi.fn().mockResolvedValue([portfolio]),
      findById: vi.fn().mockResolvedValue(portfolio),
      findByName: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      setActive: vi.fn(),
      ...overrides,
    };
  }

  it('returns the portfolio of the catalogs module', async () => {
    const catalogs = createCatalogRepositoryFixture();
    const useCase = new GetPortfolioUseCase(catalogs);

    const result = await useCase.execute(3);

    expect(catalogs.findById).toHaveBeenCalledWith('portfolio', 3);
    expect(result).toEqual(portfolio);
  });

  it('returns a deactivated portfolio with its state, so the caller can use it', async () => {
    const catalogs = createCatalogRepositoryFixture({
      findById: vi.fn().mockResolvedValue({ ...portfolio, active: false }),
    });
    const useCase = new GetPortfolioUseCase(catalogs);

    const result = await useCase.execute(3);

    expect(result.active).toBe(false);
  });

  it('throws NotFoundError when the portfolio does not exist', async () => {
    const catalogs = createCatalogRepositoryFixture({
      findById: vi.fn().mockResolvedValue(null),
    });
    const useCase = new GetPortfolioUseCase(catalogs);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundError);
  });
});
