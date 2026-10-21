import { Portfolio } from '../../domain/entities/portfolio.js';
import { PortfolioOrmEntity } from '../persistence/entities/portfolio.orm-entity.js';

export class PortfolioMapper {
  static toDomain(entity: PortfolioOrmEntity): Portfolio {
    return new Portfolio(
      entity.id,
      entity.name,
      entity.description,
      entity.active,
    );
  }

  static toPersistence(domain: Portfolio): PortfolioOrmEntity {
    const entity = new PortfolioOrmEntity();

    if (domain.id !== null) {
      entity.id = domain.id;
    }

    entity.name = domain.name;
    entity.description = domain.description;
    entity.active = domain.active;

    return entity;
  }
}
