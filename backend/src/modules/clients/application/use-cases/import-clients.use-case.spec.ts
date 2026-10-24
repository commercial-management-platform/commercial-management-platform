import { describe, expect, it, vi } from 'vitest';

import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import { ValidationError } from '../../../../shared/domain/errors/index.js';
import type {
  CatalogEntry,
  CatalogRepository,
  CatalogType,
} from '../../../catalogs/domain/repositories/catalog.repository.js';
import { Client } from '../../domain/entities/client.js';
import type { ClientImportRepository } from '../../domain/ports/client-import.repository.js';
import { CsvClientReader } from '../../infrastructure/csv/csv-client-reader.js';
import { ImportClientsUseCase } from './import-clients.use-case.js';

const HEADER =
  'nit;business_name;trade_name;address;department;municipality;neighborhood;phone;email;latitude;longitude;zone;client_type;client_potential;client_status;visit_frequency_days';

const row = (nit: string, overrides: Partial<Record<'zone' | 'email' | 'frequency', string>> = {}) =>
  [
    nit,
    `Cliente ${nit}`,
    '',
    'Calle 1 #2-3',
    'Atlántico',
    'Barranquilla',
    '',
    '',
    overrides.email ?? '',
    '10.9',
    '-74.8',
    overrides.zone ?? 'Norte',
    'Mayorista',
    'Alto',
    'Activo',
    overrides.frequency ?? '15',
  ].join(';');

const csv = (...rows: string[]) => {
  const buffer = Buffer.from([HEADER, ...rows].join('\r\n'), 'utf8');
  return { buffer, size: buffer.length, originalname: 'clientes.csv' };
};

const CATALOGS: Record<string, CatalogEntry[]> = {
  zone: [
    { id: 1, name: 'Norte', active: true },
    { id: 2, name: 'Sur', active: false },
  ],
  clientType: [{ id: 3, name: 'Mayorista', active: true }],
  clientPotential: [{ id: 4, name: 'Alto', active: true }],
  clientStatus: [{ id: 5, name: 'Activo', active: true }],
};

function setup(existingNits: string[] = []) {
  const imports = {
    findAll: vi.fn(),
    findExistingNits: vi.fn().mockResolvedValue(existingNits),
    saveImport: vi.fn().mockResolvedValue({}),
    importClients: vi.fn(async (clients: Client[]) =>
      clients.map((c, i) => new Client({ ...c, id: 100 + i })),
    ),
  };
  const catalogs = {
    findAll: vi.fn(async (type: CatalogType) => CATALOGS[type] ?? []),
  } as unknown as CatalogRepository;
  const storage = { save: vi.fn().mockResolvedValue({ fileKey: 'clients/imports/x.csv' }) };
  const activityLog = { record: vi.fn().mockResolvedValue(undefined) };
  const useCase = new ImportClientsUseCase(
    new CsvClientReader(),
    imports as unknown as ClientImportRepository,
    storage,
    catalogs,
    activityLog as ActivityLogPort,
  );
  return { useCase, imports, storage, activityLog };
}

describe('ImportClientsUseCase', () => {
  it('imports every valid row in one transaction and logs each client (CA-08, CA-11)', async () => {
    const { useCase, imports, activityLog } = setup();

    const report = await useCase.execute({
      userId: 'usr-director',
      file: csv(row('900123456-1'), row('900123456-2')),
      dryRun: false,
    });

    expect(report).toEqual({ totalRows: 2, importedRows: 2, errorRows: 0, status: 'imported', errors: [] });
    const [clients, record] = imports.importClients.mock.calls[0];
    expect(clients.map((c: Client) => [c.nit, c.zoneId, c.clientTypeId, c.active])).toEqual([
      ['900123456-1', 1, 3, true],
      ['900123456-2', 1, 3, true],
    ]);
    expect(record).toMatchObject({ status: 'imported', importedRows: 2, fileKey: 'clients/imports/x.csv' });
    expect(activityLog.record).toHaveBeenCalledTimes(2);
    expect(activityLog.record.mock.calls[0][0]).toMatchObject({
      action: 'client.imported',
      clientId: 100,
      userId: 'usr-director',
    });
  });

  it('only validates with dryRun: nothing is saved but the attempt is recorded (CA-04)', async () => {
    const { useCase, imports, activityLog } = setup();

    const report = await useCase.execute({ userId: 'u', file: csv(row('900123456-1')), dryRun: true });

    expect(report.status).toBe('validated');
    expect(imports.importClients).not.toHaveBeenCalled();
    expect(imports.saveImport).toHaveBeenCalledWith(expect.objectContaining({ status: 'validated' }));
    expect(activityLog.record).not.toHaveBeenCalled();
  });

  it('reports every error with line, column and reason, and imports nothing (CA-05..CA-09)', async () => {
    const { useCase, imports } = setup(['900000000-9']);

    const report = await useCase.execute({
      userId: 'u',
      file: csv(
        row('900123456-1'),
        row('900123456-1'),
        row('900000000-9'),
        row('900123456-3', { zone: 'Sur', email: 'no-es-correo', frequency: '0' }),
        row('123'),
      ),
      dryRun: false,
    });

    expect(report.status).toBe('failed');
    expect(report.totalRows).toBe(5);
    expect(report.errorRows).toBe(4);
    expect(report.errors).toEqual(
      expect.arrayContaining([
        { rowNumber: 3, column: 'nit', reason: 'nit is repeated in the file (line 2)' },
        { rowNumber: 4, column: 'nit', reason: 'nit already exists in the database' },
        { rowNumber: 5, column: 'zone', reason: "'Sur' does not exist or is inactive in the catalog" },
        { rowNumber: 5, column: 'email', reason: 'email format is invalid' },
        { rowNumber: 5, column: 'visit_frequency_days', reason: 'visit_frequency_days must be a positive integer' },
        { rowNumber: 6, column: 'nit', reason: 'nit format is invalid' },
      ]),
    );
    expect(imports.importClients).not.toHaveBeenCalled();
    expect(imports.saveImport).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', errorRows: 4 }));
  });

  it('also finds catalog and database errors in a dryRun', async () => {
    const { useCase } = setup(['900123456-1']);

    const report = await useCase.execute({ userId: 'u', file: csv(row('900123456-1')), dryRun: true });

    expect(report.status).toBe('failed');
    expect(report.errors[0].reason).toBe('nit already exists in the database');
  });

  it('matches catalog names without case', async () => {
    const { useCase } = setup();

    const report = await useCase.execute({ userId: 'u', file: csv(row('900123456-1', { zone: ' norte ' })), dryRun: true });

    expect(report.status).toBe('validated');
  });

  it('rejects a missing file, a file over 2 MB and more than 5000 rows (CA-02)', async () => {
    const { useCase } = setup();
    const big = { buffer: Buffer.alloc(0), size: 2 * 1024 * 1024 + 1 };
    const many = csv(...Array.from({ length: 5001 }, (_, i) => row(String(900000000 + i))));

    await expect(useCase.execute({ userId: 'u', file: undefined, dryRun: false })).rejects.toThrow(ValidationError);
    await expect(useCase.execute({ userId: 'u', file: big, dryRun: false })).rejects.toThrow('2 MB');
    await expect(useCase.execute({ userId: 'u', file: many, dryRun: false })).rejects.toThrow('5000 rows');
  });
});
