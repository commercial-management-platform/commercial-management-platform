import { Inject, Injectable } from '@nestjs/common';

import {
  CATALOG_LOOKUP,
  type CatalogLookupPort,
} from '../../../catalogs/application/ports/catalog-lookup.port.js';
import type {
  CatalogName,
  CatalogValidatorPort,
} from '../../application/ports/catalog-validator.port.js';

/**
 * Validates client catalog ids against the catalogs module (HU-05).
 * Only active entries can be assigned to a client.
 */
@Injectable()
export class CatalogLookupValidatorAdapter implements CatalogValidatorPort {
  constructor(
    @Inject(CATALOG_LOOKUP)
    private readonly catalogLookup: CatalogLookupPort,
  ) {}

  async exists(catalog: CatalogName, id: number): Promise<boolean> {
    return this.catalogLookup.isActive(catalog, id);
  }
}
