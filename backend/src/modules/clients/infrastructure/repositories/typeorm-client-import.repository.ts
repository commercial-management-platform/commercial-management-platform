import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import type { Client } from '../../domain/entities/client.js';
import type {
  ClientImportRecord,
  ClientImportRepository,
  NewClientImport,
} from '../../domain/ports/client-import.repository.js';
import { ClientMapper } from '../mappers/client.mapper.js';
import { ClientImportOrmEntity } from '../persistence/entities/client-import.orm-entity.js';
import { ClientOrmEntity } from '../persistence/entities/client.orm-entity.js';

/** Clients inserted per statement, well below the PostgreSQL parameter limit. */
const INSERT_CHUNK = 500;

function toRecord(entity: ClientImportOrmEntity): ClientImportRecord {
  return {
    id: entity.id,
    fileKey: entity.fileKey,
    totalRows: entity.totalRows,
    importedRows: entity.importedRows,
    errorRows: entity.errorRows,
    status: entity.status,
    userId: entity.userId,
    createdAt: entity.createdAt,
  };
}

@Injectable()
export class TypeOrmClientImportRepository implements ClientImportRepository {
  constructor(
    @InjectRepository(ClientImportOrmEntity)
    private readonly repository: Repository<ClientImportOrmEntity>,
    @InjectRepository(ClientOrmEntity)
    private readonly clients: Repository<ClientOrmEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<ClientImportRecord[]> {
    const entities = await this.repository.find({ order: { createdAt: 'DESC', id: 'DESC' } });
    return entities.map(toRecord);
  }

  async findExistingNits(nits: string[]): Promise<string[]> {
    const found = await this.clients.find({
      select: { nit: true },
      where: { nit: In(nits) },
    });
    return found.map((client) => client.nit);
  }

  async saveImport(data: NewClientImport): Promise<ClientImportRecord> {
    return toRecord(await this.repository.save(this.repository.create(data)));
  }

  async importClients(clients: Client[], data: NewClientImport): Promise<Client[]> {
    return this.dataSource.transaction(async (manager) => {
      const saved: ClientOrmEntity[] = [];
      for (let start = 0; start < clients.length; start += INSERT_CHUNK) {
        const chunk = clients
          .slice(start, start + INSERT_CHUNK)
          .map((client) => ClientMapper.toPersistence(client));
        saved.push(...(await manager.getRepository(ClientOrmEntity).save(chunk)));
      }
      await manager.getRepository(ClientImportOrmEntity).save(
        manager.getRepository(ClientImportOrmEntity).create(data),
      );
      return saved.map((entity) => ClientMapper.toDomain(entity));
    });
  }
}
