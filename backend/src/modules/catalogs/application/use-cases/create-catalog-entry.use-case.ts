import { Inject, Injectable } from '@nestjs/common';

import {
  ConflictError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';

import type {
  CatalogEntry,
  CatalogRepository,
  CatalogType,
} from '../../domain/repositories/catalog.repository.js';

@Injectable()
export class CreateCatalogEntryUseCase {
  constructor(
    @Inject('CatalogRepository')
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(
    type: CatalogType,
    name: string,
    order?: number,
  ): Promise<CatalogEntry> {
    const normalizedName = name.trim();

    if (type === 'clientPotential' && order === undefined) {
      throw new ValidationError('Order is required for a client potential');
    }

    if (type !== 'clientPotential' && order !== undefined) {
      throw new ValidationError(
        'Order is only supported for client potentials',
      );
    }

    const existingEntry = await this.catalogRepository.findByName(
      type,
      normalizedName,
    );

    if (existingEntry) {
      throw new ConflictError('A catalog entry with this name already exists');
    }

    return this.catalogRepository.create(type, {
      id: null,
      name: normalizedName,
      active: true,
      ...(order !== undefined ? { order } : {}),
    });
  }
}
