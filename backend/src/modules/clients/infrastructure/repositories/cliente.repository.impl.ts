import { Injectable } from '@nestjs/common';

import { Cliente } from '../../domain/entities/cliente.js';
import { ClienteRepository } from '../../domain/repositories/cliente.repository.js';
import { ClienteMapper } from '../mappers/cliente.mapper.js';
import { ClienteDao } from '../persistence/daos/cliente.dao.js';

/**
 * este importa finalmente el DAO y lo consume como si fuera el service
 * de la arquitectura por capas
 */
@Injectable()
export class ClienteRepositoryImpl implements ClienteRepository {
  constructor(private readonly clienteDao: ClienteDao) {}

  async findById(idCliente: number): Promise<Cliente | null> {
    const entity = await this.clienteDao.findById(idCliente);

    if (!entity) {
      return null;
    }

    return ClienteMapper.toDomain(entity);
  }

  async save(cliente: Cliente): Promise<Cliente> {
    const entity = ClienteMapper.toPersistence(cliente);

    const savedEntity = await this.clienteDao.save(entity);

    return ClienteMapper.toDomain(savedEntity);
  }
}
