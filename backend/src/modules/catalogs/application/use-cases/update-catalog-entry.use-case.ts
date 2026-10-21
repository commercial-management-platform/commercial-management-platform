import { Inject, Injectable } from '@nestjs/common';

import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

import type {
  CatalogEntry,
  CatalogRepository,
  CatalogType,
} from '../../domain/repositories/catalog.repository.js';

@Injectable()
export class UpdateCatalogEntryUseCase {
  constructor(
    @Inject('CatalogRepository')
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(
    type: CatalogType,
    id: number,
    name?: string,
    order?: number,
  ): Promise<CatalogEntry> {
    const existingEntry = await this.catalogRepository.findById(type, id);

    if (!existingEntry) {
      throw new NotFoundError('Catalog entry not found');
    }

    const normalizedName = name?.trim();

    if (type !== 'clientPotential' && order !== undefined) {
      throw new ValidationError(
        'Order is only supported for client potentials',
      );
    }

    if (normalizedName && normalizedName !== existingEntry.name) {
      const duplicate = await this.catalogRepository.findByName(
        type,
        normalizedName,
      );

      if (duplicate && duplicate.id !== existingEntry.id) {
        throw new ConflictError(
          'A catalog entry with this name already exists',
        );
      }
    }

    return this.catalogRepository.update(type, {
      id,
      name: normalizedName ?? existingEntry.name,
      active: existingEntry.active,
      ...(order !== undefined
        ? { order }
        : existingEntry.order !== undefined
          ? { order: existingEntry.order }
          : {}),
    });
  }
}
