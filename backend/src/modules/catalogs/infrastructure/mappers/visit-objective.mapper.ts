import { VisitObjective } from '../../domain/entities/visit-objective.js';
import { VisitObjectiveOrmEntity } from '../persistence/entities/visit-objective.orm-entity.js';

export class VisitObjectiveMapper {
  static toDomain(entity: VisitObjectiveOrmEntity): VisitObjective {
    return new VisitObjective(entity.id, entity.name, entity.active);
  }

  static toPersistence(domain: VisitObjective): VisitObjectiveOrmEntity {
    const entity = new VisitObjectiveOrmEntity();

    if (domain.id !== null) {
      entity.id = domain.id;
    }

    entity.name = domain.name;
    entity.active = domain.active;

    return entity;
  }
}
