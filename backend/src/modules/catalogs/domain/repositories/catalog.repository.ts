export type CatalogType =
  | 'zone'
  | 'clientType'
  | 'clientPotential'
  | 'clientStatus'
  | 'visitResult'
  | 'visitObjective'
  | 'visitType'
  | 'portfolio';

export interface CatalogEntry {
  id: number | null;
  name: string;
  active: boolean;
  order?: number;
  description?: string | null;
}

export interface CatalogRepository {
  findAll(type: CatalogType): Promise<CatalogEntry[]>;

  findById(type: CatalogType, id: number): Promise<CatalogEntry | null>;

  findByName(type: CatalogType, name: string): Promise<CatalogEntry | null>;

  create(type: CatalogType, entry: CatalogEntry): Promise<CatalogEntry>;

  update(type: CatalogType, entry: CatalogEntry): Promise<CatalogEntry>;

  setActive(type: CatalogType, id: number, active: boolean): Promise<void>;
}
