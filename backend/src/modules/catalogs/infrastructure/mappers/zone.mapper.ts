import { Zone } from '../../domain/entities/zone.js';
import { ZoneOrmEntity } from '../persistence/entities/zone.orm-entity.js';

export class ZoneMapper {
  static toDomain(entity: ZoneOrmEntity): Zone {
    return new Zone(entity.id, entity.name, entity.active);
  }

  static toPersistence(domain: Zone): ZoneOrmEntity {
    const entity = new ZoneOrmEntity();

    if (domain.id !== null) {
      entity.id = domain.id;
    }

    entity.name = domain.name;
    entity.active = domain.active;

    return entity;
  }
}
