import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import { ValidationError } from '../../../../shared/domain/errors/index.js';
import type {
  CatalogRepository,
  CatalogType,
} from '../../../catalogs/domain/repositories/catalog.repository.js';
import {
  ClientImportRow,
  type ClientImportRowData,
} from '../../domain/client-import-row.js';
import { Client } from '../../domain/entities/client.js';
import type { ClientImportReaderPort } from '../../domain/ports/client-import-reader.port.js';
import type {
  ClientImportRepository,
  NewClientImport,
} from '../../domain/ports/client-import.repository.js';
import type {
  ClientImportFile,
  ClientImportStoragePort,
} from '../../domain/ports/client-import-storage.port.js';

/** Limits of CA-02. */
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;

/** The header is line 1, so the first client is line 2 of the file. */
const FIRST_DATA_LINE = 2;

export interface ImportClientsInput {
  userId: string;
  file: ClientImportFile | undefined;
  /** Only validate: nothing is saved (CA-04). */
  dryRun: boolean;
}

export interface ClientImportError {
  /** Line of the file, counting the header as line 1. */
  rowNumber: number;
  column: string;
  reason: string;
}

export interface ClientImportReport {
  totalRows: number;
  importedRows: number;
  /** Rows with at least one error (a row may have several). */
  errorRows: number;
  status: 'validated' | 'imported' | 'failed';
  errors: ClientImportError[];
}

/** CSV column → catalog it names (CA-06). */
const CATALOG_COLUMNS = {
  zone: 'zone',
  client_type: 'clientType',
  client_potential: 'clientPotential',
  client_status: 'clientStatus',
} as const satisfies Record<string, CatalogType>;

type CatalogColumn = keyof typeof CATALOG_COLUMNS;
type CatalogIds = Record<CatalogColumn, number>;

/** Catalog names are matched without case or surrounding spaces. */
const catalogKey = (name: string) => name.trim().toLocaleLowerCase('es');

/**
 * Bulk import of clients from a CSV file (HU-22). Every row is validated
 * first: format (CA-05), catalog names (CA-06) and NITs repeated in the file
 * or in the database (CA-07). With a single error nothing is imported (CA-08);
 * otherwise every client is saved in one transaction.
 */
export class ImportClientsUseCase {
  constructor(
    private readonly reader: ClientImportReaderPort,
    private readonly imports: ClientImportRepository,
    private readonly storage: ClientImportStoragePort,
    private readonly catalogs: CatalogRepository,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: ImportClientsInput): Promise<ClientImportReport> {
    const { file } = input;
    if (!file) throw new ValidationError('file is required');
    if (file.size > IMPORT_MAX_BYTES) {
      throw new ValidationError('file must be up to 2 MB');
    }

    const rows = this.reader.parse(file.buffer);
    if (rows.length > IMPORT_MAX_ROWS) {
      throw new ValidationError(`file must have up to ${IMPORT_MAX_ROWS} rows`);
    }

    const { clients, errors } = await this.validate(rows);
    const errorRows = new Set(errors.map((e) => e.rowNumber)).size;
    const failed = errors.length > 0;
    const status = failed ? 'failed' : input.dryRun ? 'validated' : 'imported';

    // The original file is kept (only its key goes to the database, CA-10).
    const { fileKey } = await this.storage.save(file);
    const record: NewClientImport = {
      fileKey,
      totalRows: rows.length,
      importedRows: status === 'imported' ? clients.length : 0,
      errorRows,
      status,
      userId: input.userId,
    };

    if (status !== 'imported') {
      await this.imports.saveImport(record);
      return { totalRows: rows.length, importedRows: 0, errorRows, status, errors };
    }

    const saved = await this.imports.importClients(clients, record);
    await this.logImported(saved, input.userId);
    return {
      totalRows: rows.length,
      importedRows: saved.length,
      errorRows: 0,
      status,
      errors: [],
    };
  }

  private async validate(
    rows: Record<string, string>[],
  ): Promise<{ clients: Client[]; errors: ClientImportError[] }> {
    const catalogIds = await this.loadCatalogs();
    const nitsInFile = rows.map((row) => (row.nit ?? '').trim()).filter(Boolean);
    const existing = new Set(
      nitsInFile.length > 0 ? await this.imports.findExistingNits(nitsInFile) : [],
    );

    const errors: ClientImportError[] = [];
    const clients: Client[] = [];
    const firstLineOfNit = new Map<string, number>();

    rows.forEach((raw, index) => {
      const rowNumber = index + FIRST_DATA_LINE;
      const fail = (column: string, reason: string) =>
        errors.push({ rowNumber, column, reason });

      const { row, errors: formatErrors } = ClientImportRow.validate(raw);
      formatErrors.forEach((e) => fail(e.column, e.reason));

      const nit = (raw.nit ?? '').trim();
      if (nit) {
        const firstLine = firstLineOfNit.get(nit);
        if (firstLine !== undefined) {
          fail('nit', `nit is repeated in the file (line ${firstLine})`);
        } else {
          firstLineOfNit.set(nit, rowNumber);
        }
        if (existing.has(nit)) fail('nit', 'nit already exists in the database');
      }

      const ids: Partial<CatalogIds> = {};
      for (const column of Object.keys(CATALOG_COLUMNS) as CatalogColumn[]) {
        const name = (raw[column] ?? '').trim();
        if (!name) continue; // Already reported as required by the format check.
        const id = catalogIds[column].get(catalogKey(name));
        if (id === undefined) {
          fail(column, `'${name}' does not exist or is inactive in the catalog`);
        } else {
          ids[column] = id;
        }
      }

      if (row && errors.every((e) => e.rowNumber !== rowNumber)) {
        clients.push(toClient(row, ids as CatalogIds));
      }
    });

    return { clients, errors };
  }

  /** Active entries of each catalog by name, read once per file. */
  private async loadCatalogs(): Promise<Record<CatalogColumn, Map<string, number>>> {
    const entries = await Promise.all(
      (Object.entries(CATALOG_COLUMNS) as [CatalogColumn, CatalogType][]).map(
        async ([column, type]) => {
          const list = await this.catalogs.findAll(type);
          const byName = new Map<string, number>();
          for (const entry of list) {
            if (entry.active && entry.id !== null) byName.set(catalogKey(entry.name), entry.id);
          }
          return [column, byName] as const;
        },
      ),
    );
    return Object.fromEntries(entries) as Record<CatalogColumn, Map<string, number>>;
  }

  /** One `client.imported` entry per new client (CA-11), after the commit. */
  private async logImported(clients: Client[], userId: string): Promise<void> {
    const occurredAt = new Date();
    for (const client of clients) {
      await this.activityLog.record({
        action: 'client.imported',
        userId,
        clientId: client.id!,
        description: `Client ${client.businessName} (NIT ${client.nit}) imported from CSV`,
        occurredAt,
      });
    }
  }
}

/** Imported clients start active (HU-22, section 3). */
function toClient(row: ClientImportRowData, ids: CatalogIds): Client {
  return new Client({
    id: null,
    nit: row.nit,
    businessName: row.businessName,
    tradeName: row.tradeName,
    address: row.address,
    department: row.department,
    municipality: row.municipality,
    neighborhood: row.neighborhood,
    phone: row.phone,
    email: row.email,
    zoneId: ids.zone,
    clientTypeId: ids.client_type,
    clientPotentialId: ids.client_potential,
    clientStatusId: ids.client_status,
    visitFrequencyDays: row.visitFrequencyDays,
    latitude: row.latitude,
    longitude: row.longitude,
    active: true,
    createdAt: null,
    updatedAt: null,
  });
}
