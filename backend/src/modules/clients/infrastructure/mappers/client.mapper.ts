import { Client } from '../../domain/client.js';
import { ClientOrmEntity } from '../persistence/entities/client.orm-entity.js';

export class ClientMapper {
  static toDomain(entity: ClientOrmEntity): Client {
    return new Client(
      entity.id,
      entity.nit,
      entity.businessName,
      entity.tradeName,
      entity.address,
      entity.department,
      entity.municipality,
      entity.neighborhood,
      entity.phone,
      entity.email,
      entity.zoneId,
      entity.clientTypeId,
      entity.clientPotentialId,
      entity.clientStatusId,
      entity.visitFrequencyDays,
      entity.active,
      entity.createdAt,
    );
  }

  static toPersistence(client: Client): ClientOrmEntity {
    const entity = new ClientOrmEntity();
    // A new client has no id yet; the database generates it on insert.
    if (client.id !== null) {
      entity.id = client.id;
    }
    entity.nit = client.nit;
    entity.businessName = client.businessName;
    entity.tradeName = client.tradeName;
    entity.address = client.address;
    entity.department = client.department;
    entity.municipality = client.municipality;
    entity.neighborhood = client.neighborhood;
    entity.phone = client.phone;
    entity.email = client.email;
    entity.zoneId = client.zoneId;
    entity.clientTypeId = client.clientTypeId;
    entity.clientPotentialId = client.clientPotentialId;
    entity.clientStatusId = client.clientStatusId;
    entity.visitFrequencyDays = client.visitFrequencyDays;
    entity.active = client.active;
    // createdAt is left to the database.
    return entity;
  }
}
