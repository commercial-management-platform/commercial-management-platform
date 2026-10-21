import { ClientPotential } from '../../domain/entities/client-potential.js';
import { ClientPotentialOrmEntity } from '../persistence/entities/client-potential.orm-entity.js';

export class ClientPotentialMapper {
  static toDomain(entity: ClientPotentialOrmEntity): ClientPotential {
    return new ClientPotential(
      entity.id,
      entity.name,
      entity.order,
      entity.active,
    );
  }

  static toPersistence(domain: ClientPotential): ClientPotentialOrmEntity {
    const entity = new ClientPotentialOrmEntity();

    if (domain.id !== null) {
      entity.id = domain.id;
    }

    entity.name = domain.name;
    entity.order = domain.order;
    entity.active = domain.active;

    return entity;
  }
}
