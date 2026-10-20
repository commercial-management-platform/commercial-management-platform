import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { validateEnv } from './env.validation.js';
import { buildPostgresOptions } from './typeorm.config.js';

/**
 * DataSource for the TypeORM CLI and the seed runner.
 * It always runs from the compiled code, so it looks for .js files in dist/.
 */
const env = validateEnv(process.env);

// dist/config -> dist. Glob patterns need forward slashes, also on Windows.
const distRoot = join(import.meta.dirname, '..').replaceAll('\\', '/');

export default new DataSource({
  ...buildPostgresOptions(env),
  entities: [`${distRoot}/modules/**/*.orm-entity.js`],
  migrations: [`${distRoot}/database/migrations/*.js`],
  migrationsTableName: 'migrations',
});
