import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';

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
      throw new BadRequestException('Order is required for a client potential');
    }

    if (type !== 'clientPotential' && order !== undefined) {
      throw new BadRequestException(
        'Order is only supported for client potentials',
      );
    }

    const existingEntry = await this.catalogRepository.findByName(
      type,
      normalizedName,
    );

    if (existingEntry) {
      throw new ConflictException(
        'A catalog entry with this name already exists',
      );
    }

    return this.catalogRepository.create(type, {
      id: null,
      name: normalizedName,
      active: true,
      ...(order !== undefined ? { order } : {}),
    });
  }
}
