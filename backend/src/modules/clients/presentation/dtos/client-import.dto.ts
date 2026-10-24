import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import type { ClientImportReport } from '../../application/use-cases/import-clients.use-case.js';
import type { ClientImportRecord } from '../../domain/ports/client-import.repository.js';

export class ImportClientsQueryDto {
  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description: 'true only validates the file, without saving anything (CA-04)',
  })
  @IsOptional()
  // A query string is always text: "true" and "false" become booleans.
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  dryRun?: boolean;
}

export class ClientImportErrorDto {
  @ApiProperty({ example: 3, description: 'Line of the file; the header is line 1' })
  rowNumber: number;

  @ApiProperty({ example: 'nit' })
  column: string;

  @ApiProperty({ example: 'nit already exists in the database' })
  reason: string;
}

export class ClientImportReportDto {
  @ApiProperty({ example: 5 })
  totalRows: number;

  @ApiProperty({ example: 5 })
  importedRows: number;

  @ApiProperty({ example: 0, description: 'Rows with at least one error' })
  errorRows: number;

  @ApiProperty({ enum: ['validated', 'imported', 'failed'], example: 'imported' })
  status: ClientImportReport['status'];

  @ApiProperty({ type: [ClientImportErrorDto] })
  errors: ClientImportErrorDto[];
}

export class ClientImportRecordDto {
  @ApiProperty() id: number;
  @ApiProperty({ example: 'clients/imports/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed.csv' })
  fileKey: string;
  @ApiProperty() totalRows: number;
  @ApiProperty() importedRows: number;
  @ApiProperty() errorRows: number;
  @ApiProperty({ enum: ['validated', 'imported', 'failed'] }) status: ClientImportRecord['status'];
  @ApiProperty() userId: string;
  @ApiProperty() createdAt: Date;

  static fromDomain(record: ClientImportRecord): ClientImportRecordDto {
    return Object.assign(new ClientImportRecordDto(), record);
  }
}
