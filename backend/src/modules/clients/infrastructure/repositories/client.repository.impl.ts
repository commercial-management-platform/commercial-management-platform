import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Client } from '../../domain/client.js';
import { type ClientRepository } from '../../domain/client.repository.js';
import { ClientMapper } from '../mappers/client.mapper.js';
import { ClientOrmEntity } from '../persistence/entities/client.orm-entity.js';

@Injectable()
export class TypeOrmClientRepository implements ClientRepository {
  constructor(
    @InjectRepository(ClientOrmEntity)
    private readonly repository: Repository<ClientOrmEntity>,
  ) {}

  async findById(id: number): Promise<Client | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return ClientMapper.toDomain(entity);
  }

  async save(client: Client): Promise<Client> {
    const entity = ClientMapper.toPersistence(client);
    const saved = await this.repository.save(entity);
    return ClientMapper.toDomain(saved);
  }
}
