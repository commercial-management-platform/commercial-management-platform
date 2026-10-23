import type { ClientPortfolio } from '../entities/client-portfolio.js';

export const CLIENT_PORTFOLIO_REPOSITORY = Symbol('CLIENT_PORTFOLIO_REPOSITORY');

export interface ClientPortfolioRepository {
  /** Associations of a portfolio. */
  findByPortfolio(portfolioId: number): Promise<ClientPortfolio[]>;
  /** The association of a portfolio and a client, when it exists. */
  findAssociation(
    portfolioId: number,
    clientId: number,
  ): Promise<ClientPortfolio | null>;
  /**
   * Creates the association. The unique constraint
   * `uq_client_portfolio_portfolio_client` is the guarantee against a race
   * between two concurrent requests, so the repository answers a conflict when
   * the association already exists.
   */
  associate(portfolioId: number, clientId: number): Promise<ClientPortfolio>;
  /** Removes only the association: the client and the portfolio are kept. */
  removeAssociation(portfolioId: number, clientId: number): Promise<void>;
}
