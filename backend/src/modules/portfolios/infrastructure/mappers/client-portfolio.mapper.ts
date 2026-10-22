import { ClientPortfolio } from '../../domain/entities/client-portfolio.js';
import { ClientPortfolioOrmEntity } from '../persistence/entities/client-portfolio.orm-entity.js';

export class ClientPortfolioMapper {
  static toDomain(entity: ClientPortfolioOrmEntity): ClientPortfolio {
    return new ClientPortfolio(entity.id, entity.portfolioId, entity.clientId);
  }

  static toPersistence(association: ClientPortfolio): ClientPortfolioOrmEntity {
    const entity = new ClientPortfolioOrmEntity();

    // A new association has no id yet; the database generates it on insert.
    if (association.id !== null) {
      entity.id = association.id;
    }
    entity.portfolioId = association.portfolioId;
    entity.clientId = association.clientId;

    return entity;
  }
}
