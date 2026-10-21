import { ValidationError } from '../../../shared/domain/errors/index.js';
import type { CatalogLookupPort } from '../../catalogs/application/ports/catalog-lookup.port.js';
import type { AdvisorLookupPort } from './ports/advisor-lookup.port.js';

/**
 * Checks that the given zone and advisor exist and are active. Only the ids
 * passed are checked, so an update can keep a zone or advisor that was
 * deactivated after it was assigned.
 */
export async function assertRouteReferencesActive(
  catalogs: CatalogLookupPort,
  advisors: AdvisorLookupPort,
  ids: { zoneId?: number; advisorId?: number },
): Promise<void> {
  if (
    ids.zoneId !== undefined &&
    !(await catalogs.isActive('zone', ids.zoneId))
  ) {
    throw new ValidationError(`Unknown or inactive zone id '${ids.zoneId}'`);
  }
  if (
    ids.advisorId !== undefined &&
    !(await advisors.isActive(ids.advisorId))
  ) {
    throw new ValidationError(
      `Unknown or inactive advisor id '${ids.advisorId}'`,
    );
  }
}
