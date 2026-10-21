import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Client } from '../../domain/entities/client.js';
import type {
  ClientFilterOptions,
  ClientRepository,
  UpdateClientData,
} from '../../domain/repositories/client.repository.js';
import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/domain/errors/index.js';
import { ClientMapper } from '../mappers/client.mapper.js';
import { ClientOrmEntity } from '../persistence/entities/client.orm-entity.js';

interface PostgresDriverError {
  code?: string;
}

@Injectable()
export class TypeOrmClientRepository implements ClientRepository {
  constructor(
    @InjectRepository(ClientOrmEntity)
    private readonly repository: Repository<ClientOrmEntity>,
  ) {}

  async findAll(options?: ClientFilterOptions): Promise<Client[]> {
    // An empty scope means the advisor has no assigned clients.
    if (options?.ids !== undefined && options.ids.length === 0) {
      return [];
    }

    const qb = this.repository.createQueryBuilder('client');

    if (options?.ids !== undefined) {
      qb.andWhere('client.id IN (:...ids)', { ids: options.ids });
    }
    if (options?.active !== undefined) {
      qb.andWhere('client.active = :active', { active: options.active });
    }
    if (options?.zoneId !== undefined) {
      qb.andWhere('client.zone_id = :zoneId', { zoneId: options.zoneId });
    }
    if (options?.clientTypeId !== undefined) {
      qb.andWhere('client.client_type_id = :clientTypeId', {
        clientTypeId: options.clientTypeId,
      });
    }
    if (options?.clientPotentialId !== undefined) {
      qb.andWhere('client.client_potential_id = :clientPotentialId', {
        clientPotentialId: options.clientPotentialId,
      });
    }
    if (options?.clientStatusId !== undefined) {
      qb.andWhere('client.client_status_id = :clientStatusId', {
        clientStatusId: options.clientStatusId,
      });
    }
    if (options?.search && options.search.trim().length > 0) {
      const search = `%${options.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(client.nit) LIKE :search OR LOWER(client.business_name) LIKE :search)',
        { search },
      );
    }

    qb.orderBy('client.created_at', 'DESC');

    const entities = await qb.getMany();
    return entities.map((entity) => ClientMapper.toDomain(entity));
  }

  async findById(id: number): Promise<Client | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ClientMapper.toDomain(entity) : null;
  }

  async findByNit(nit: string): Promise<Client | null> {
    const entity = await this.repository.findOne({ where: { nit } });
    return entity ? ClientMapper.toDomain(entity) : null;
  }

  async save(client: Client): Promise<Client> {
    try {
      const entity = ClientMapper.toPersistence(client);
      const saved = await this.repository.save(entity);
      return ClientMapper.toDomain(saved);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async update(id: number, data: UpdateClientData): Promise<Client> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundError(`Client with id '${id}' not found`);
    }

    if (data.nit !== undefined) {
      entity.nit = data.nit;
    }
    if (data.businessName !== undefined) {
      entity.businessName = data.businessName;
    }
    if (data.tradeName !== undefined) {
      entity.tradeName = data.tradeName;
    }
    if (data.address !== undefined) {
      entity.address = data.address;
    }
    if (data.department !== undefined) {
      entity.department = data.department;
    }
    if (data.municipality !== undefined) {
      entity.municipality = data.municipality;
    }
    if (data.neighborhood !== undefined) {
      entity.neighborhood = data.neighborhood;
    }
    if (data.phone !== undefined) {
      entity.phone = data.phone;
    }
    if (data.email !== undefined) {
      entity.email = data.email;
    }
    if (data.zoneId !== undefined) {
      entity.zoneId = data.zoneId;
    }
    if (data.clientTypeId !== undefined) {
      entity.clientTypeId = data.clientTypeId;
    }
    if (data.clientPotentialId !== undefined) {
      entity.clientPotentialId = data.clientPotentialId;
    }
    if (data.clientStatusId !== undefined) {
      entity.clientStatusId = data.clientStatusId;
    }
    if (data.visitFrequencyDays !== undefined) {
      entity.visitFrequencyDays = data.visitFrequencyDays;
    }
    if (data.latitude !== undefined) {
      entity.latitude = data.latitude;
    }
    if (data.longitude !== undefined) {
      entity.longitude = data.longitude;
    }
    if (data.active !== undefined) {
      entity.active = data.active;
    }

    try {
      const saved = await this.repository.save(entity);
      return ClientMapper.toDomain(saved);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  private translateUniqueViolation(error: unknown): unknown {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as PostgresDriverError | undefined;
      if (driverError?.code === '23505') {
        return new ConflictError('A client with the same NIT already exists');
      }
    }
    return error;
  }
}
