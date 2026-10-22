import type {
  CatalogEntry,
  CatalogRepository,
} from '../../../catalogs/domain/repositories/catalog.repository.js';
import { findPortfolio } from '../portfolio-resolution.js';

/**
 * Reads a single portfolio.
 *
 * The portfolio data comes from the catalogs module (HU-05), which owns the
 * `portfolio` table. A portfolio that does not exist answers as not found.
 */
export class GetPortfolioUseCase {
  constructor(private readonly catalogs: CatalogRepository) {}

  async execute(portfolioId: number): Promise<CatalogEntry> {
    return findPortfolio(this.catalogs, portfolioId, { requireActive: false });
  }
}
