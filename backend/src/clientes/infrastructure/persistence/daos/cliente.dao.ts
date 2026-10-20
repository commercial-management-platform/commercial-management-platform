import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClienteOrmEntity } from '../entities/cliente.orm-entity.js';

/**
 * este es el DAO, aqui importa la entidad y estan los metodos de typeorm
 * definidos para las distintas funcionalidades.
 * ¡será el unico que conoce directamente a TYPEORM!
 */
@Injectable()
export class ClienteDao {
  constructor(
    @InjectRepository(ClienteOrmEntity)
    private readonly repository: Repository<ClienteOrmEntity>,
  ) {}

  async findById(idCliente: number): Promise<ClienteOrmEntity | null> {
    return this.repository.findOne({
      where: {
        idCliente,
      },
    });
  }

  async save(cliente: ClienteOrmEntity): Promise<ClienteOrmEntity> {
    return this.repository.save(cliente);
  }
}