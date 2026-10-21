import { Client } from '../../domain/entities/client.js';
import { ClientOrmEntity } from '../persistence/entities/client.orm-entity.js';

export class ClientMapper {
  static toDomain(entity: ClientOrmEntity): Client {
    return new Client({
      id: entity.id,
      nit: entity.nit,
      businessName: entity.businessName,
      tradeName: entity.tradeName,
      address: entity.address,
      department: entity.department,
      municipality: entity.municipality,
      neighborhood: entity.neighborhood,
      phone: entity.phone,
      email: entity.email,
      zoneId: entity.zoneId,
      clientTypeId: entity.clientTypeId,
      clientPotentialId: entity.clientPotentialId,
      clientStatusId: entity.clientStatusId,
      visitFrequencyDays: entity.visitFrequencyDays,
      latitude: entity.latitude === null ? null : Number(entity.latitude),
      longitude: entity.longitude === null ? null : Number(entity.longitude),
      active: entity.active,
      createdAt:
        entity.createdAt instanceof Date
          ? entity.createdAt
          : new Date(entity.createdAt),
      updatedAt:
        entity.updatedAt instanceof Date
          ? entity.updatedAt
          : new Date(entity.updatedAt),
    });
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
    entity.latitude = client.latitude;
    entity.longitude = client.longitude;
    entity.active = client.active;
    // created_at and updated_at are handled by the database.

    return entity;
  }
}
