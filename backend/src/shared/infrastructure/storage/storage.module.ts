import { S3Client } from '@aws-sdk/client-s3';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../../config/env.validation.js';
import { STORAGE } from '../../application/ports/storage.port.js';
import { S3StorageAdapter } from './s3-storage.adapter.js';

/**
 * Conecta el puerto STORAGE con S3. Los módulos que necesiten guardar
 * archivos (cotizaciones, importación de clientes) importan este módulo e
 * inyectan STORAGE.
 */
@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        new S3StorageAdapter(
          // Sin credenciales: el SDK usa el rol IAM de la EC2.
          new S3Client({ region: config.get('AWS_REGION', { infer: true }) }),
          config.get('S3_BUCKET_NAME', { infer: true }),
          config.get('S3_SIGNED_URL_EXPIRES_SECONDS', { infer: true }),
        ),
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
