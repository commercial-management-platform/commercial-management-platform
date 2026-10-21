export type CatalogType =
  | 'zone'
  | 'clientType'
  | 'clientPotential'
  | 'clientStatus'
  | 'visitResult'
  | 'visitObjective'
  | 'visitType';

export interface CatalogEntry {
  id: number | null;
  name: string;
  active: boolean;
  order?: number;
}

export interface CatalogRepository {
  findAll(type: CatalogType): Promise<CatalogEntry[]>;

  findById(type: CatalogType, id: number): Promise<CatalogEntry | null>;

  findByName(type: CatalogType, name: string): Promise<CatalogEntry | null>;

  create(type: CatalogType, entry: CatalogEntry): Promise<CatalogEntry>;

  update(type: CatalogType, entry: CatalogEntry): Promise<CatalogEntry>;

  deactivate(type: CatalogType, id: number): Promise<void>;

  setActive(type: CatalogType, id: number, active: boolean): Promise<void>;
}
