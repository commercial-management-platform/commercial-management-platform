import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { CatalogRepository } from '../../../catalogs/domain/repositories/catalog.repository.js';
import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import { ClientImportRow } from '../../domain/client-import-row.js';
import { Client } from '../../domain/entities/client.js';
import type { ClientImportRepository } from '../../domain/ports/client-import.repository.js';
import type { ClientImportStoragePort } from '../../domain/ports/client-import-storage.port.js';
import { ValidationError } from '../../../../shared/domain/errors/index.js';
import { CsvClientReader } from '../../infrastructure/csv/csv-client-reader.js';

export type UploadedClientImportFile = {
  buffer: Buffer;
  size: number;
  originalname?: string;
  mimetype?: string;
};

export interface ImportClientsInput {
  userId: string;
  file: UploadedClientImportFile;
  dryRun?: boolean;
}

export interface ClientImportError {
  rowNumber: number;
  column: string;
  reason: string;
}

export interface ClientImportReport {
  totalRows: number;
  importedRows: number;
  errorRows: number;
  status: 'validated' | 'imported' | 'failed';
  errors: ClientImportError[];
}

@Injectable()
export class ImportClientsUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly clientImports: ClientImportRepository,
    private readonly storage: ClientImportStoragePort,
    private readonly catalogs: CatalogRepository,
    private readonly dataSource: DataSource,
  ) {}

  async execute(input: ImportClientsInput): Promise<ClientImportReport> {
    if (!input.file) {
      throw new ValidationError('file is required');
    }

    if (input.file.size > 2 * 1024 * 1024) {
      throw new ValidationError('file must be up to 2 MB');
    }

    const csv = new CsvClientReader().parse(input.file.buffer);
    if (csv.length === 0) {
      return {
        totalRows: 0,
        importedRows: 0,
        errorRows: 0,
        status: 'validated',
        errors: [],
      };
    }

    const errors: ClientImportError[] = [];
    const validRows: Array<{ rowNumber: number; values: Record<string, string> }> = [];

    for (const [index, row] of csv.entries()) {
      const rowNumber = index + 2;
      const validation = ClientImportRow.validate(row);

      if (validation.errors.length > 0) {
        validation.errors.forEach((error) => {
          errors.push({ rowNumber, column: error.column, reason: error.reason });
        });
        continue;
      }

      validRows.push({ rowNumber, values: row });
    }

    if (errors.length > 0) {
      return {
        totalRows: csv.length,
        importedRows: 0,
        errorRows: errors.length,
        status: 'failed',
        errors,
      };
    }

    if (input.dryRun === true) {
      return {
        totalRows: csv.length,
        importedRows: 0,
        errorRows: 0,
        status: 'validated',
        errors: [],
      };
    }

    const preparedRows: Client[] = [];

    for (const item of validRows) {
      const row = item.values;
      const nit = String(row.nit ?? '').trim();

      const existingClient = await this.clients.findByNit(nit);
      if (existingClient) {
        errors.push({
          rowNumber: item.rowNumber,
          column: 'nit',
          reason: 'nit already exists in the database',
        });
        continue;
      }

      const zoneId = await this.lookupCatalogId('zone', row.zone ?? '');
      const clientTypeId = await this.lookupCatalogId(
        'client_type',
        row.client_type ?? '',
      );
      const clientPotentialId = await this.lookupCatalogId(
        'client_potential',
        row.client_potential ?? '',
      );
      const clientStatusId = await this.lookupCatalogId(
        'client_status',
        row.client_status ?? '',
      );

      if (
        zoneId === null ||
        clientTypeId === null ||
        clientPotentialId === null ||
        clientStatusId === null
      ) {
        errors.push({
          rowNumber: item.rowNumber,
          column: 'catalog',
          reason: 'one or more catalog names do not exist or are inactive',
        });
        continue;
      }

      const client = new Client({
        id: null,
        nit,
        businessName: String(row.business_name ?? '').trim(),
        tradeName: row.trade_name ? String(row.trade_name).trim() : null,
        address: row.address ? String(row.address).trim() : null,
        department: row.department ? String(row.department).trim() : null,
        municipality: row.municipality ? String(row.municipality).trim() : null,
        neighborhood: row.neighborhood ? String(row.neighborhood).trim() : null,
        phone: row.phone ? String(row.phone).trim() : null,
        email: row.email ? String(row.email).trim() : null,
        zoneId,
        clientTypeId,
        clientPotentialId,
        clientStatusId,
        visitFrequencyDays: Number(row.visit_frequency_days),
        latitude: row.latitude ? Number(row.latitude) : null,
        longitude: row.longitude ? Number(row.longitude) : null,
        active: true,
        createdAt: null,
        updatedAt: null,
      });

      preparedRows.push(client);
    }

    if (errors.length > 0) {
      return {
        totalRows: csv.length,
        importedRows: 0,
        errorRows: errors.length,
        status: 'failed',
        errors,
      };
    }

    const fileRef = await this.storage.save(input.file);

    await this.dataSource.transaction(async (manager) => {
      for (const client of preparedRows) {
        await manager.getRepository(Client).save(client);
      }
    });

    await this.clientImports.saveImport({
      fileKey: fileRef.fileKey,
      totalRows: csv.length,
      importedRows: preparedRows.length,
      errorRows: 0,
      status: 'imported',
      userId: input.userId,
    });

    return {
      totalRows: csv.length,
      importedRows: preparedRows.length,
      errorRows: 0,
      status: 'imported',
      errors: [],
    };
  }

  private async lookupCatalogId(
    catalog: 'zone' | 'client_type' | 'client_potential' | 'client_status',
    name: string,
  ): Promise<number | null> {
    const catalogTypeMap = {
      zone: 'zone',
      client_type: 'clientType',
      client_potential: 'clientPotential',
      client_status: 'clientStatus',
    } as const;

    const normalized = name.trim();
    if (!normalized) {
      return null;
    }

    const entry = await this.catalogs.findByName(
      catalogTypeMap[catalog],
      normalized,
    );

    if (!entry || !entry.active || entry.id === null) {
      return null;
    }

    return entry.id;
  }
}
