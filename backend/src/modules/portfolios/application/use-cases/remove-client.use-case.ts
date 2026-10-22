import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import type { ClientActor } from '../../../clients/application/types/client-actor.js';
import type { CatalogRepository } from '../../../catalogs/domain/repositories/catalog.repository.js';
import type { ClientPortfolioRepository } from '../../domain/repositories/client-portfolio.repository.js';
import { findPortfolio } from '../portfolio-resolution.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';

export interface RemoveClientInput {
  actor: ClientActor;
  portfolioId: number;
  clientId: number;
}

/**
 * Removes the association between a client and a portfolio.
 *
 * Only the association is deleted: the client and the portfolio keep their
 * data. The portfolio may be deactivated, otherwise a client could never
 * leave a portfolio that is being retired.
 */
export class RemoveClientUseCase {
  constructor(
    private readonly catalogs: CatalogRepository,
    private readonly clientPortfolios: ClientPortfolioRepository,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: RemoveClientInput): Promise<void> {
    await findPortfolio(this.catalogs, input.portfolioId, {
      requireActive: false,
    });

    const existing = await this.clientPortfolios.findAssociation(
      input.portfolioId,
      input.clientId,
    );
    if (!existing) {
      throw new NotFoundError(
        `Client '${input.clientId}' is not associated to the portfolio '${input.portfolioId}'`,
      );
    }

    await this.clientPortfolios.removeAssociation(
      input.portfolioId,
      input.clientId,
    );

    await this.activityLog.record({
      action: 'client.portfolio_removed',
      userId: input.actor.id,
      clientId: input.clientId,
      description: `Client ${input.clientId} removed from portfolio ${input.portfolioId}`,
      occurredAt: new Date(),
    });
  }
}
