import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  CatalogRepository,
  CatalogType,
} from '../../domain/repositories/catalog.repository.js';

@Injectable()
export class DeactivateCatalogEntryUseCase {
  constructor(
    @Inject('CatalogRepository')
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(type: CatalogType, id: number): Promise<void> {
    const existingEntry = await this.catalogRepository.findById(type, id);

    if (!existingEntry) {
      throw new NotFoundException('Catalog entry not found');
    }

    await this.catalogRepository.deactivate(type, id);
  }
}
