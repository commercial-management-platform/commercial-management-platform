import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type {
  CatalogRepository,
  CatalogType,
} from '../../domain/repositories/catalog.repository.js';

@Injectable()
export class SetCatalogEntryStatusUseCase {
  constructor(
    @Inject('CatalogRepository')
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(type: CatalogType, id: number, active: boolean): Promise<void> {
    const entry = await this.catalogRepository.findById(type, id);

    if (!entry) {
      throw new NotFoundException('Catalog entry not found');
    }

    await this.catalogRepository.setActive(type, id, active);
  }
}
