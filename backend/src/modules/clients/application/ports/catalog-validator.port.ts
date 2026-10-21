export const CATALOG_VALIDATOR = Symbol('CATALOG_VALIDATOR');

export type CatalogName =
  | 'zone'
  | 'client_type'
  | 'client_potential'
  | 'client_status';

export interface CatalogValidatorPort {
  exists(catalog: CatalogName, id: number): Promise<boolean>;
}
