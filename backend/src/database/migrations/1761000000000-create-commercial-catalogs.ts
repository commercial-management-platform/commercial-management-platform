import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the commercial catalog tables for HU-05.
 *
 * Same style as CreateClientTable: raw SQL with IF NOT EXISTS and named
 * constraints. Names are unique case-insensitively through a functional
 * index `uq_<table>_name_lower`; the catalogs seed relies on that index for
 * its ON CONFLICT clause.
 *
 * The foreign keys from `client` to these tables are not created here; they
 * are added by the clients module once it switches to the catalog lookup.
 */
const SIMPLE_CATALOGS = [
  'zone',
  'client_type',
  'client_status',
  'visit_result',
  'visit_objective',
  'visit_type',
] as const;

const ALL_CATALOGS = [
  ...SIMPLE_CATALOGS,
  'client_potential',
  'portfolio',
] as const;

export class CreateCommercialCatalogs1761000000000 implements MigrationInterface {
  name = 'CreateCommercialCatalogs1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of SIMPLE_CATALOGS) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "${table}" (
          "id" SERIAL NOT NULL,
          "name" varchar NOT NULL,
          "active" boolean NOT NULL DEFAULT true,
          CONSTRAINT "PK_${table}_id" PRIMARY KEY ("id")
        );
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_potential" (
        "id" SERIAL NOT NULL,
        "name" varchar NOT NULL,
        "sort_order" integer NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_client_potential_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "portfolio" (
        "id" SERIAL NOT NULL,
        "name" varchar NOT NULL,
        "description" varchar,
        "active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_portfolio_id" PRIMARY KEY ("id")
      );
    `);

    for (const table of ALL_CATALOGS) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "uq_${table}_name_lower" ON "${table}" (LOWER("name"));`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...ALL_CATALOGS].reverse()) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}";`);
    }
  }
}
