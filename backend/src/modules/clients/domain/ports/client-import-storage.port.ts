export const CLIENT_IMPORT_STORAGE = Symbol('CLIENT_IMPORT_STORAGE');

export type ClientImportFile = {
  buffer: Buffer;
  size: number;
  originalname?: string;
  mimetype?: string;
};

export interface ClientImportStoragePort {
  save(file: ClientImportFile): Promise<{ fileKey: string }>;
}
