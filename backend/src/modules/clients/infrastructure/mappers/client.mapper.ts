import { Client } from '../../domain/client.js';
import { ClientOrmEntity } from '../persistence/entities/client.orm-entity.js';

export class ClientMapper {
  static toDomain(entity: ClientOrmEntity): Client {
    return new Client(entity.id, entity.name);
  }

  static toPersistence(client: Client): ClientOrmEntity {
    const entity = new ClientOrmEntity();
    if (client.id !== null) {
      entity.id = client.id;
    }
    entity.name = client.name;
    return entity;
  }
}
