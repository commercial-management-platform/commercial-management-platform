import { ClientStatus } from '../../domain/entities/client-status.js';
import { ClientStatusOrmEntity } from '../persistence/entities/client-status.orm-entity.js';

export class ClientStatusMapper {
  static toDomain(entity: ClientStatusOrmEntity): ClientStatus {
    return new ClientStatus(entity.id, entity.name, entity.active);
  }

  static toPersistence(domain: ClientStatus): ClientStatusOrmEntity {
    const entity = new ClientStatusOrmEntity();

    if (domain.id !== null) {
      entity.id = domain.id;
    }

    entity.name = domain.name;
    entity.active = domain.active;

    return entity;
  }
}
