import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  ClientImportFile,
  ClientImportStoragePort,
} from '../../domain/ports/client-import-storage.port.js';

/**
 * Deferred adapter until HU-20 (files in S3) is merged: it only assigns the
 * key the file will have in the bucket, clients/imports/{uuid}.csv, and does
 * not upload it yet. Replace it with the S3 storage adapter when it exists;
 * the use case does not change.
 */
@Injectable()
export class PendingClientImportStorageAdapter implements ClientImportStoragePort {
  async save(_file: ClientImportFile): Promise<{ fileKey: string }> {
    return { fileKey: `clients/imports/${randomUUID()}.csv` };
  }
}
