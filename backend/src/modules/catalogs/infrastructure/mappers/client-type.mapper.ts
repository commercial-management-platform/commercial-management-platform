import { ClientType } from '../../domain/entities/client-type.js';
import { ClientTypeOrmEntity } from '../persistence/entities/client-type.orm-entity.js';

export class ClientTypeMapper {
  static toDomain(entity: ClientTypeOrmEntity): ClientType {
    return new ClientType(entity.id, entity.name, entity.active);
  }

  static toPersistence(domain: ClientType): ClientTypeOrmEntity {
    const entity = new ClientTypeOrmEntity();

    if (domain.id !== null) {
      entity.id = domain.id;
    }

    entity.name = domain.name;
    entity.active = domain.active;

    return entity;
  }
}
