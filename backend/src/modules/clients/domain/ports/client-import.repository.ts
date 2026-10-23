export const CLIENT_IMPORT_REPOSITORY = Symbol('CLIENT_IMPORT_REPOSITORY');

export type ClientImportStatus = 'validated' | 'imported' | 'failed';

export interface ClientImportRecord {
  id: number;
  fileKey: string;
  totalRows: number;
  importedRows: number;
  errorRows: number;
  status: ClientImportStatus;
  userId: string;
  createdAt: Date;
}

export interface ClientImportRepository {
  findAll(): Promise<ClientImportRecord[]>;
  saveImport(data: {
    fileKey: string;
    totalRows: number;
    importedRows: number;
    errorRows: number;
    status: ClientImportStatus;
    userId: string;
  }): Promise<ClientImportRecord>;
}
