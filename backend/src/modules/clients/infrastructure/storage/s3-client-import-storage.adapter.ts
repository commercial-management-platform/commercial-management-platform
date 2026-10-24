import { randomUUID } from 'node:crypto';

import type { StoragePort } from '../../../../shared/application/ports/storage.port.js';
import type {
  ClientImportFile,
  ClientImportStoragePort,
} from '../../domain/ports/client-import-storage.port.js';

/**
 * Guarda el CSV original de una importación en S3 (HU-22 / HU-20) usando el
 * servicio compartido de archivos. La BD guarda solo la key (CA-10).
 */
export class S3ClientImportStorageAdapter implements ClientImportStoragePort {
  constructor(private readonly storage: StoragePort) {}

  async save(file: ClientImportFile): Promise<{ fileKey: string }> {
    const fileKey = await this.storage.upload({
      key: `clients/imports/${randomUUID()}.csv`,
      body: file.buffer,
      contentType: 'text/csv',
    });
    return { fileKey };
  }
}
