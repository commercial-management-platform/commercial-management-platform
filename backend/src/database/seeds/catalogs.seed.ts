import type { DataSource } from 'typeorm';
import type { Seed } from './seed.js';

interface CatalogSeedData {
  table: string;
  /** Extra columns besides `name`, in the order they appear in each row. */
  columns: string[];
  rows: Array<[string, ...(string | number)[]]>;
}

const CATALOGS: CatalogSeedData[] = [
  {
    table: 'zone',
    columns: [],
    rows: [['Norte'], ['Sur'], ['Centro'], ['Metropolitana']],
  },
  {
    table: 'client_type',
    columns: [],
    rows: [['Industrial'], ['Distribuidor'], ['Retail']],
  },
  {
    table: 'client_potential',
    columns: ['sort_order'],
    rows: [
      ['Alto', 1],
      ['Medio', 2],
      ['Bajo', 3],
    ],
  },
  {
    table: 'client_status',
    columns: [],
    rows: [['Prospecto'], ['Activo'], ['Inactivo']],
  },
  {
    table: 'visit_result',
    columns: [],
    rows: [['Interesado'], ['Pedido'], ['No interesado'], ['No visitado']],
  },
  {
    table: 'visit_objective',
    columns: [],
    rows: [
      ['Presentación de nueva línea'],
      ['Seguimiento de cotización'],
      ['Cierre comercial'],
      ['Servicio posventa'],
    ],
  },
  {
    table: 'visit_type',
    columns: [],
    rows: [['Prospección'], ['Desarrollo de cliente'], ['Seguimiento']],
  },
  {
    table: 'portfolio',
    columns: ['description'],
    rows: [
      ['Equipos industriales', 'Maquinaria y equipos para la industria'],
      ['Herramientas', 'Herramientas manuales y eléctricas'],
      ['Ferretería', 'Artículos de ferretería en general'],
      ['Insumos de soldadura', 'Electrodos, gases y consumibles de soldadura'],
    ],
  },
];

/**
 * Inserts the default entries of every commercial catalog (HU-05).
 * Idempotent: an entry whose name already exists (case-insensitive, through
 * the uq_<table>_name_lower index) is skipped, so entries edited or
 * deactivated by an admin are left untouched. Does not touch users.
 */
export const catalogsSeed: Seed = {
  name: 'catalogs',
  async run(dataSource: DataSource): Promise<void> {
    for (const catalog of CATALOGS) {
      const columns = ['name', ...catalog.columns];
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnList = columns.map((c) => `"${c}"`).join(', ');
      let inserted = 0;

      for (const row of catalog.rows) {
        const result: unknown[] = await dataSource.query(
          `INSERT INTO "${catalog.table}" (${columnList}) VALUES (${placeholders})
           ON CONFLICT ((LOWER("name"))) DO NOTHING
           RETURNING "id"`,
          row,
        );
        inserted += result.length;
      }

      console.log(
        `  [catalogs] ${catalog.table}: ${inserted} inserted, ${catalog.rows.length - inserted} already present`,
      );
    }
  },
};
