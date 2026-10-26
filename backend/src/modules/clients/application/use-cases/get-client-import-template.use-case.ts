import type {
  CatalogRepository,
  CatalogType,
} from '../../../catalogs/domain/repositories/catalog.repository.js';

/** Columns of the template, named after the client table (HU-03), in order. */
export const CLIENT_IMPORT_COLUMNS = [
  'nit',
  'business_name',
  'trade_name',
  'address',
  'department',
  'municipality',
  'neighborhood',
  'phone',
  'email',
  'latitude',
  'longitude',
  'zone',
  'client_type',
  'client_potential',
  'client_status',
  'visit_frequency_days',
] as const;

/** First active entry of a catalog, so the example row uses real names. */
async function firstName(
  catalogs: CatalogRepository,
  type: CatalogType,
  fallback: string,
): Promise<string> {
  const [first] = await catalogs.findAll(type);
  return first?.name ?? fallback;
}

/**
 * CSV template of the import (HU-22, CA-01): the expected headers and one
 * example row whose catalog names exist, so it validates as it is.
 */
export class GetClientImportTemplateUseCase {
  constructor(private readonly catalogs: CatalogRepository) {}

  async execute(): Promise<string[][]> {
    const [zone, clientType, potential, status] = await Promise.all([
      firstName(this.catalogs, 'zone', 'Norte'),
      firstName(this.catalogs, 'clientType', 'Mayorista'),
      firstName(this.catalogs, 'clientPotential', 'Alto'),
      firstName(this.catalogs, 'clientStatus', 'Activo'),
    ]);
    return [
      [...CLIENT_IMPORT_COLUMNS],
      [
        '900123456-5',
        'Distribuidora Andina S.A.S',
        'Andina',
        'Calle 80 #45-12',
        'Atlántico',
        'Barranquilla',
        'El Prado',
        '6053334455',
        'ventas@andina.co',
        '10.98783',
        '-74.79653',
        zone,
        clientType,
        potential,
        status,
        '15',
      ],
    ];
  }
}
