/**
 * Association between a client and a portfolio.
 *
 * The portfolio itself belongs to the catalogs module (HU-05, seed only, no
 * CRUD). This entity only describes that a client is part of a portfolio, so
 * removing it never deletes the client nor the portfolio.
 */
export class ClientPortfolio {
  constructor(
    public readonly id: number | null,
    public readonly portfolioId: number,
    public readonly clientId: number,
  ) {}
}
