export const CATALOG_LOOKUP = Symbol('CATALOG_LOOKUP');

/** Catalog table names, as listed in docs/naming-glossary.md. */
export type CatalogName =
  | 'zone'
  | 'client_type'
  | 'client_potential'
  | 'client_status'
  | 'visit_result'
  | 'visit_objective'
  | 'visit_type'
  | 'portfolio';

/**
 * Read-only access to the catalogs for other modules, exported by
 * CatalogsModule. Lets a module validate a catalog id without depending on
 * the catalog tables.
 */
export interface CatalogLookupPort {
  /** True when `id` exists in `catalog` and the entry is active. */
  isActive(catalog: CatalogName, id: number): Promise<boolean>;
}
