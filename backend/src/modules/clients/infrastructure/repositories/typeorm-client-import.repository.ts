import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type {
  ClientImportRecord,
  ClientImportRepository,
} from '../../domain/ports/client-import.repository.js';
import { ClientImportOrmEntity } from '../persistence/entities/client-import.orm-entity.js';

@Injectable()
export class TypeOrmClientImportRepository implements ClientImportRepository {
  constructor(
    @InjectRepository(ClientImportOrmEntity)
    private readonly repository: Repository<ClientImportOrmEntity>,
  ) {}

  async findAll(): Promise<ClientImportRecord[]> {
    const entities = await this.repository.find({
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => ({
      id: entity.id,
      fileKey: entity.fileKey,
      totalRows: entity.totalRows,
      importedRows: entity.importedRows,
      errorRows: entity.errorRows,
      status: entity.status,
      userId: entity.userId,
      createdAt: entity.createdAt,
    }));
  }

  async saveImport(data: {
    fileKey: string;
    totalRows: number;
    importedRows: number;
    errorRows: number;
    status: 'validated' | 'imported' | 'failed';
    userId: string;
  }): Promise<ClientImportRecord> {
    const entity = this.repository.create({
      fileKey: data.fileKey,
      totalRows: data.totalRows,
      importedRows: data.importedRows,
      errorRows: data.errorRows,
      status: data.status,
      userId: data.userId,
    });

    const saved = await this.repository.save(entity);

    return {
      id: saved.id,
      fileKey: saved.fileKey,
      totalRows: saved.totalRows,
      importedRows: saved.importedRows,
      errorRows: saved.errorRows,
      status: saved.status,
      userId: saved.userId,
      createdAt: saved.createdAt,
    };
  }
}
