import type { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import type { EnvironmentVariables } from './env.validation.js';

type DatabaseEnv = Pick<
  EnvironmentVariables,
  'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME' | 'DB_SSL'
>;

/**
 * Connection options shared by the Nest app and the TypeORM CLI (data-source.ts).
 * With DB_SSL=true the server certificate is verified; for RDS, point
 * NODE_EXTRA_CA_CERTS to the AWS RDS CA bundle (see docs/architecture.md).
 */
export function buildPostgresOptions(
  env: DatabaseEnv,
): PostgresDataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
    connectTimeoutMS: 5000,
    synchronize: false,
  };
}

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
    ...buildPostgresOptions({
      DB_HOST: config.get('DB_HOST', { infer: true }),
      DB_PORT: config.get('DB_PORT', { infer: true }),
      DB_USER: config.get('DB_USER', { infer: true }),
      DB_PASSWORD: config.get('DB_PASSWORD', { infer: true }),
      DB_NAME: config.get('DB_NAME', { infer: true }),
      DB_SSL: config.get('DB_SSL', { infer: true }),
    }),
    // Schema changes only through migrations, never at startup.
    synchronize: false,
    migrationsRun: false,
    autoLoadEntities: true,
  }),
};
