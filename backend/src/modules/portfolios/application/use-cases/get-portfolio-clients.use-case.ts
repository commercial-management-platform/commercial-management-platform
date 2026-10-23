import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { ClientActor } from '../../../clients/application/types/client-actor.js';
import type { Client } from '../../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { CatalogRepository } from '../../../catalogs/domain/repositories/catalog.repository.js';
import type { ClientPortfolioRepository } from '../../domain/repositories/client-portfolio.repository.js';
import { findPortfolio } from '../portfolio-resolution.js';

export interface GetPortfolioClientsInput {
  actor: ClientActor;
  portfolioId: number;
}

/**
 * Lists the clients associated to a portfolio.
 *
 * The portfolio must exist. Advisors only see the clients on their routes, the
 * same visibility rule the clients and contacts modules apply.
 */
export class GetPortfolioClientsUseCase {
  constructor(
    private readonly catalogs: CatalogRepository,
    private readonly clientPortfolios: ClientPortfolioRepository,
    private readonly clients: ClientRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(input: GetPortfolioClientsInput): Promise<Client[]> {
    await findPortfolio(this.catalogs, input.portfolioId, {
      requireActive: false,
    });

    const associations = await this.clientPortfolios.findByPortfolio(
      input.portfolioId,
    );

    if (associations.length === 0) {
      return [];
    }

    const clientIds = associations.map(
      (association) => association.clientId,
    );

    const visibleIds =
      input.actor.role === UserRole.Advisor
        ? await this.visibleIds(input.actor.id, clientIds)
        : clientIds;

    if (visibleIds.length === 0) {
      return [];
    }

    return this.clients.findAll({ ids: visibleIds });
  }

  /** Keeps only the clients of the portfolio that the advisor can reach. */
  private async visibleIds(
    userId: string,
    clientIds: number[],
  ): Promise<number[]> {
    const accessible = await this.advisorAccess.getAccessibleClientIds(userId);
    return clientIds.filter((clientId) => accessible.includes(clientId));
  }
}
