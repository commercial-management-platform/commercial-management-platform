// Generates a TypeORM migration in src/database/migrations from the compiled DataSource.
// Usage: npm run migration:generate -- --name=CreateClientTable
// A Node script (instead of an inline npm command) so it works the same on Windows and Linux.
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { name: { type: 'string' } } });
const name = values.name;

if (!name || !/^[A-Z][A-Za-z0-9]*$/.test(name)) {
  console.error(
    'Provide a PascalCase name: npm run migration:generate -- --name=CreateClientTable',
  );
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    '--env-file-if-exists=.env',
    './node_modules/typeorm/cli.js',
    'migration:generate',
    `src/database/migrations/${name}`,
    '--dataSource',
    'dist/config/data-source.js',
    '--pretty',
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
