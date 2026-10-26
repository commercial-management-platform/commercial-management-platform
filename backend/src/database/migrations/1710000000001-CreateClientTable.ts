import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `client` table for HU-03 (client management).
 *
 * Hand-written in the same style as CreateAuthTables: raw SQL with
 * IF NOT EXISTS and named constraints. The unique constraint name must
 * match `@Unique('uq_client_nit')` on ClientOrmEntity, otherwise a future
 * migration:generate would drop and recreate it.
 *
 * The catalog foreign keys (zone_id, client_type_id, client_potential_id,
 * client_status_id) are added by HU-05 when the catalogs exist.
 */
export class CreateClientTable1710000000001 implements MigrationInterface {
  name = 'CreateClientTable1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client" (
        "id" SERIAL NOT NULL,
        "nit" varchar NOT NULL,
        "business_name" varchar NOT NULL,
        "trade_name" varchar,
        "address" varchar,
        "department" varchar,
        "municipality" varchar,
        "neighborhood" varchar,
        "phone" varchar,
        "email" varchar,
        "zone_id" integer,
        "client_type_id" integer,
        "client_potential_id" integer,
        "client_status_id" integer,
        "visit_frequency_days" integer,
        "latitude" double precision,
        "longitude" double precision,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_client_nit" UNIQUE ("nit")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "client";`);
  }
}
