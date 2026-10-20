import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClientTable1792501201376 implements MigrationInterface {
  name = 'CreateClientTable1792501201376';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Catalog ids (zone, client_type, client_potential, client_status) get
    // their foreign keys in the migration that creates each catalog.
    await queryRunner.query(`
      CREATE TABLE client (
        id SERIAL PRIMARY KEY,
        nit VARCHAR NOT NULL,
        business_name VARCHAR NOT NULL,
        trade_name VARCHAR,
        address VARCHAR,
        department VARCHAR,
        municipality VARCHAR,
        neighborhood VARCHAR,
        phone VARCHAR,
        email VARCHAR,
        zone_id INTEGER,
        client_type_id INTEGER,
        client_potential_id INTEGER,
        client_status_id INTEGER,
        visit_frequency_days INTEGER,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_client_nit UNIQUE (nit)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS client`);
  }
}
