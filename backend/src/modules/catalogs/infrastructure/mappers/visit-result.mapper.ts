import { VisitResult } from '../../domain/entities/visit-result.js';
import { VisitResultOrmEntity } from '../persistence/entities/visit-result.orm-entity.js';

export class VisitResultMapper {
  static toDomain(entity: VisitResultOrmEntity): VisitResult {
    return new VisitResult(entity.id, entity.name, entity.active);
  }

  static toPersistence(domain: VisitResult): VisitResultOrmEntity {
    const entity = new VisitResultOrmEntity();

    if (domain.id !== null) {
      entity.id = domain.id;
    }

    entity.name = domain.name;
    entity.active = domain.active;

    return entity;
  }
}
