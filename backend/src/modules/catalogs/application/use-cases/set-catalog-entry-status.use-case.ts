import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../../../../shared/domain/errors/index.js';

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
      throw new NotFoundError('Catalog entry not found');
    }

    await this.catalogRepository.setActive(type, id, active);
  }
}
