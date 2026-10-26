import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type {
  StoragePort,
  StorageUploadInput,
} from '../../application/ports/storage.port.js';

/**
 * Implementación del servicio de archivos con Amazon S3 (AWS SDK v3).
 *
 * No recibe llaves: en la EC2 el cliente toma las credenciales del rol IAM
 * automáticamente (CA-02). El bucket es privado, así que los archivos solo se
 * ven con URLs firmadas que vencen (CA-06).
 */
export class S3StorageAdapter implements StoragePort {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly signedUrlExpiresSeconds: number,
  ) {}

  async upload({ key, body, contentType }: StorageUploadInput): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    // La BD guarda solo la key, nunca la URL (CA-04).
    return key;
  }

  getSignedUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.signedUrlExpiresSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
