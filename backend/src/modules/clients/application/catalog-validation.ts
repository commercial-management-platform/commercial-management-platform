import { ValidationError } from '../../../shared/domain/errors/index.js';
import type {
  CatalogName,
  CatalogValidatorPort,
} from './ports/catalog-validator.port.js';

export type CatalogValues = Partial<Record<CatalogName, number | null>>;

/**
 * Verifies that every provided catalog id refers to a valid record.
 * Null or undefined ids are ignored: they mean "not provided" or "cleared".
 */
export async function assertCatalogsExist(
  validator: CatalogValidatorPort,
  values: CatalogValues,
): Promise<void> {
  for (const [catalog, id] of Object.entries(values)) {
    if (id === null || id === undefined) continue;
    if (!(await validator.exists(catalog as CatalogName, id))) {
      throw new ValidationError(`Unknown ${catalog} id '${id}'`);
    }
  }
}
