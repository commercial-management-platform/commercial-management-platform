import type { Client } from '../entities/client.js';

export const CLIENT_IMPORT_REPOSITORY = Symbol('CLIENT_IMPORT_REPOSITORY');

/** validated = checked without saving (dryRun); failed = nothing was saved. */
export type ClientImportStatus = 'validated' | 'imported' | 'failed';

/** Row of client_import: only the reference of the file, never its content (CA-10). */
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

export type NewClientImport = Omit<ClientImportRecord, 'id' | 'createdAt'>;

export interface ClientImportRepository {
  /** Newest first. */
  findAll(): Promise<ClientImportRecord[]>;

  /** The NITs of `nits` that already belong to a client (CA-07). */
  findExistingNits(nits: string[]): Promise<string[]>;

  /** Records an attempt that saved no client (validated or failed). */
  saveImport(data: NewClientImport): Promise<ClientImportRecord>;

  /**
   * Saves every client and the import record in a single transaction (CA-08):
   * all or nothing. Returns the clients with their new ids.
   */
  importClients(clients: Client[], data: NewClientImport): Promise<Client[]>;
}
