import { VisitType } from '../../domain/entities/visit-type.js';
import { VisitTypeOrmEntity } from '../persistence/entities/visit-type.orm-entity.js';

export class VisitTypeMapper {
  static toDomain(entity: VisitTypeOrmEntity): VisitType {
    return new VisitType(entity.id, entity.name, entity.active);
  }

  static toPersistence(domain: VisitType): VisitTypeOrmEntity {
    const entity = new VisitTypeOrmEntity();

    if (domain.id !== null) {
      entity.id = domain.id;
    }

    entity.name = domain.name;
    entity.active = domain.active;

    return entity;
  }
}
