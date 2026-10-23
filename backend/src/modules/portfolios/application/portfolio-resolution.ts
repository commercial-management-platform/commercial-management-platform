import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import type {
  CatalogEntry,
  CatalogRepository,
} from '../../catalogs/domain/repositories/catalog.repository.js';

export interface ResolvePortfolioOptions {
  /**
   * When true, a deactivated portfolio is rejected. Reads accept it (the
   * response exposes its `active` state) but a write only works on an active
   * portfolio, the same rule the clients module applies to its catalogs.
   */
  requireActive: boolean;
}

/**
 * Resolves a portfolio from the catalogs module (HU-05).
 *
 * The portfolio table is owned by the catalogs module: it is seeded and it
 * has no CRUD, so the portfolios module only reads it.
 */
export async function findPortfolio(
  catalogs: CatalogRepository,
  portfolioId: number,
  options: ResolvePortfolioOptions,
): Promise<CatalogEntry> {
  const portfolio = await catalogs.findById('portfolio', portfolioId);

  if (!portfolio) {
    throw new NotFoundError(`Portfolio with id '${portfolioId}' not found`);
  }

  if (options.requireActive && !portfolio.active) {
    throw new ValidationError(
      `Unknown or inactive portfolio id '${portfolioId}'`,
    );
  }

  return portfolio;
}
