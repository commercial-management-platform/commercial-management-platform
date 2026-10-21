import { Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { ConflictError } from '../../../../shared/domain/errors/index.js';

import {
  CatalogEntry,
  CatalogRepository,
  CatalogType,
} from '../../domain/repositories/catalog.repository.js';

import { CatalogDao } from '../persistence/daos/catalog.dao.js';

type CatalogPersistenceEntry = {
  id: number;
  name: string;
  active: boolean;
  order?: number;
  description?: string | null;
};

interface PostgresDriverError {
  code?: string;
}

@Injectable()
export class CatalogRepositoryImpl implements CatalogRepository {
  constructor(private readonly catalogDao: CatalogDao) {}

  private toCatalogEntry(entity: CatalogPersistenceEntry): CatalogEntry {
    return {
      id: entity.id,
      name: entity.name,
      active: entity.active,
      ...(entity.order !== undefined ? { order: entity.order } : {}),
      ...(entity.description !== undefined
        ? { description: entity.description }
        : {}),
    };
  }

  // The uq_<table>_name_lower index still catches a duplicate that slips
  // past the use case check through a concurrent request.
  private translateUniqueViolation(error: unknown): unknown {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as PostgresDriverError | undefined;
      if (driverError?.code === '23505') {
        return new ConflictError(
          'A catalog entry with this name already exists',
        );
      }
    }
    return error;
  }

  async findAll(type: CatalogType): Promise<CatalogEntry[]> {
    const entities = await this.catalogDao.findAll(type);

    return entities.map((entity) => this.toCatalogEntry(entity));
  }

  async findById(type: CatalogType, id: number): Promise<CatalogEntry | null> {
    const entity = await this.catalogDao.findById(type, id);

    if (!entity) {
      return null;
    }

    return this.toCatalogEntry(entity);
  }

  async findByName(
    type: CatalogType,
    name: string,
  ): Promise<CatalogEntry | null> {
    const entity = await this.catalogDao.findByName(type, name);

    if (!entity) {
      return null;
    }

    return this.toCatalogEntry(entity);
  }

  async create(type: CatalogType, entry: CatalogEntry): Promise<CatalogEntry> {
    const entity = {
      id: undefined,
      name: entry.name,
      active: entry.active,
      ...(entry.order !== undefined ? { order: entry.order } : {}),
    };

    let savedEntity;
    try {
      savedEntity = await this.catalogDao.save(type, entity as any);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }

    return this.toCatalogEntry(savedEntity);
  }

  async update(type: CatalogType, entry: CatalogEntry): Promise<CatalogEntry> {
    if (entry.id === null) {
      throw new Error('Catalog entry id is required for update');
    }

    let savedEntity;
    try {
      savedEntity = await this.catalogDao.update(type, entry.id, {
        name: entry.name,
        active: entry.active,
        ...(entry.order !== undefined ? { order: entry.order } : {}),
      } as any);
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }

    if (!savedEntity) {
      throw new Error(`Catalog entry ${entry.id} was not found`);
    }

    return this.toCatalogEntry(savedEntity);
  }

  async setActive(
    type: CatalogType,
    id: number,
    active: boolean,
  ): Promise<void> {
    await this.catalogDao.update(type, id, { active } as any);
  }
}
