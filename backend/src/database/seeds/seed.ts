import type { DataSource } from 'typeorm';
import dataSource from '../../config/data-source.js';
import { usersSeed } from './users.seed.js';
import { catalogsSeed } from './catalogs.seed.js';
import { clientsSeed } from './clients.seed.js';
import { demoDataSeed } from './demo-data.seed.js';

export interface Seed {
  name: string;
  run(dataSource: DataSource): Promise<void>;
}

/** Seeds run in this order. Catalogs are added here by their user stories. */
const seeds: Seed[] = [usersSeed, catalogsSeed, clientsSeed, demoDataSeed];

async function runSeeds(): Promise<void> {
  await dataSource.initialize();
  try {
    for (const seed of seeds) {
      console.log(`Running seed: ${seed.name}`);
      await seed.run(dataSource);
    }
    console.log(`Seeds finished (${seeds.length} executed).`);
  } finally {
    await dataSource.destroy();
  }
}

try {
  await runSeeds();
} catch (error) {
  console.error('Seed execution failed:', error);
  process.exitCode = 1;
}
