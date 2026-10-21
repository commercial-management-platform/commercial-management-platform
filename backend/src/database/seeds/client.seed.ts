import type { DataSource } from 'typeorm';
import type { Seed } from './seed.js';

export const clientSeed: Seed = {
  name: 'client',
  async run(dataSource: DataSource): Promise<void> {
    await dataSource.query(
      `INSERT INTO client (id, nit, business_name) VALUES (1, '900000001-1', 'Seed Client') ON CONFLICT (id) DO NOTHING`,
    );
    // An explicit id does not advance the SERIAL sequence; move it past the
    // highest id so the next normal INSERT does not collide.
    await dataSource.query(
      `SELECT setval(pg_get_serial_sequence('client', 'id'), (SELECT MAX(id) FROM client))`,
    );
  },
};
