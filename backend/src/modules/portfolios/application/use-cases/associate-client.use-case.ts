import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import type { ClientActor } from '../../../clients/application/types/client-actor.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { CatalogRepository } from '../../../catalogs/domain/repositories/catalog.repository.js';
import type { ClientPortfolioRepository } from '../../domain/repositories/client-portfolio.repository.js';
import { findPortfolio } from '../portfolio-resolution.js';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/index.js';

export interface AssociateClientInput {
  actor: ClientActor;
  portfolioId: number;
  clientId: number;
}

/**
 * Associates an existing client to an existing portfolio.
 *
 * Both resources must exist: the portfolio must be active and the client must
 * be in the database. The association is refused when it already exists, both
 * by this check and by the unique constraint of the table, which is the
 * guarantee against a race between two concurrent requests.
 */
export class AssociateClientUseCase {
  constructor(
    private readonly catalogs: CatalogRepository,
    private readonly clientPortfolios: ClientPortfolioRepository,
    private readonly clients: ClientRepository,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: AssociateClientInput): Promise<void> {
    const portfolio = await findPortfolio(this.catalogs, input.portfolioId, {
      requireActive: true,
    });

    const client = await this.clients.findById(input.clientId);
    if (!client) {
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }

    const existing = await this.clientPortfolios.findAssociation(
      input.portfolioId,
      input.clientId,
    );
    if (existing) {
      throw new ConflictError(
        'Client already associated to the portfolio',
      );
    }

    await this.clientPortfolios.associate(input.portfolioId, input.clientId);

    await this.activityLog.record({
      action: 'client.portfolio_added',
      userId: input.actor.id,
      clientId: input.clientId,
      description: `Client ${input.clientId} associated to portfolio ${portfolio.id}`,
      occurredAt: new Date(),
    });
  }
}
