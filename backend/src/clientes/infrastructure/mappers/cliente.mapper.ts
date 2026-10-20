import { Cliente } from '../../domain/entities/cliente.js';
import { ClienteOrmEntity } from '../persistence/entities/cliente.orm-entity.js';

export class ClienteMapper {
  static toDomain(entity: ClienteOrmEntity): Cliente {
    return new Cliente(
      entity.idCliente,
      entity.nit,
      entity.razonSocial,
      entity.nombreComercial,
      entity.direccion,
      entity.departamento,
      entity.municipio,
      entity.barrio,
      entity.telefono,
      entity.email,
      entity.idZona,
      entity.idTipoCliente,
      entity.idPotencial,
      entity.idEstadoCliente,
      entity.frecuenciaVisitaDias,
      entity.fechaCreacion,
      entity.activo,
    );
  }

  static toPersistence(cliente: Cliente): ClienteOrmEntity {
    const entity = new ClienteOrmEntity();

    entity.idCliente = cliente.idCliente ?? 0;
    entity.nit = cliente.nit;
    entity.razonSocial = cliente.razonSocial;
    entity.nombreComercial = cliente.nombreComercial;
    entity.direccion = cliente.direccion;
    entity.departamento = cliente.departamento;
    entity.municipio = cliente.municipio;
    entity.barrio = cliente.barrio;
    entity.telefono = cliente.telefono;
    entity.email = cliente.email;
    entity.idZona = cliente.idZona;
    entity.idTipoCliente = cliente.idTipoCliente;
    entity.idPotencial = cliente.idPotencial;
    entity.idEstadoCliente = cliente.idEstadoCliente;
    entity.frecuenciaVisitaDias = cliente.frecuenciaVisitaDias;
    entity.fechaCreacion = cliente.fechaCreacion;
    entity.activo = cliente.activo;

    return entity;
  }
}