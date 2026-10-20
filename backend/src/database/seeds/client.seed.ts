import type { DataSource } from 'typeorm';
import type { Seed } from './seed.js';

export const clientSeed: Seed = {
  name: 'client',
  async run(dataSource: DataSource): Promise<void> {
    await dataSource.query(
      `INSERT INTO client (id, name) VALUES (1, 'Seed Client') ON CONFLICT (id) DO NOTHING`,
    );
  },
};
