import { Injectable } from '@nestjs/common';

import type {
  CatalogName,
  CatalogValidatorPort,
} from '../../application/ports/catalog-validator.port.js';

/**
 * Catalogs (HU-05) do not exist yet, so only the shape of the id is checked.
 * Replace this adapter with a TypeORM implementation once HU-05 is merged.
 */
@Injectable()
export class DeferredCatalogValidatorAdapter implements CatalogValidatorPort {
  async exists(_catalog: CatalogName, id: number): Promise<boolean> {
    return Number.isInteger(id) && id > 0;
  }
}
