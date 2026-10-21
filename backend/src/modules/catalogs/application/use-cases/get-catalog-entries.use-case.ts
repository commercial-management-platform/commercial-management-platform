import { Inject, Injectable } from '@nestjs/common';

import type {
  CatalogEntry,
  CatalogRepository,
  CatalogType,
} from '../../domain/repositories/catalog.repository.js';

@Injectable()
export class GetCatalogEntriesUseCase {
  constructor(
    @Inject('CatalogRepository')
    private readonly catalogRepository: CatalogRepository,
  ) {}

  async execute(type: CatalogType): Promise<CatalogEntry[]> {
    return this.catalogRepository.findAll(type);
  }
}
