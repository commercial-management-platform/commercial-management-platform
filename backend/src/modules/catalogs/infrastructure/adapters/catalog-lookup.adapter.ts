import { Injectable } from '@nestjs/common';

import type {
  CatalogLookupPort,
  CatalogName,
} from '../../application/ports/catalog-lookup.port.js';
import type { CatalogType } from '../../domain/repositories/catalog.repository.js';
import { CatalogDao } from '../persistence/daos/catalog.dao.js';

const CATALOG_TYPES: Record<CatalogName, CatalogType> = {
  zone: 'zone',
  client_type: 'clientType',
  client_potential: 'clientPotential',
  client_status: 'clientStatus',
  visit_result: 'visitResult',
  visit_objective: 'visitObjective',
  visit_type: 'visitType',
  portfolio: 'portfolio',
};

@Injectable()
export class CatalogLookupAdapter implements CatalogLookupPort {
  constructor(private readonly catalogDao: CatalogDao) {}

  async isActive(catalog: CatalogName, id: number): Promise<boolean> {
    const type = CATALOG_TYPES[catalog];

    // An id outside the PostgreSQL integer range would make the query fail.
    if (!type || !Number.isInteger(id) || id <= 0 || id > 2_147_483_647) {
      return false;
    }

    const entry = await this.catalogDao.findById(type, id);

    return entry?.active === true;
  }
}
