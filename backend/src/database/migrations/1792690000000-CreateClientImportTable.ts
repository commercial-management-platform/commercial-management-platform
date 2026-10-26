import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `client_import` table for HU-22 (import clients from CSV).
 * It is new, not in the ER model: listed in docs/naming-glossary.md.
 *
 * Constraint and index names must match ClientImportOrmEntity, otherwise a
 * future migration:generate would drop and recreate them.
 *
 * - file_key is the reference of the original CSV in storage (HU-20); the
 *   file itself never goes to the database (CA-10).
 * - status: validated (dryRun without errors), imported or failed.
 * - user_id is the betterAuth user that uploaded the file (from the session).
 */
export class CreateClientImportTable1792690000000 implements MigrationInterface {
  name = 'CreateClientImportTable1792690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "client_import" (
        "id" SERIAL NOT NULL,
        "file_key" varchar(255) NOT NULL,
        "total_rows" integer NOT NULL,
        "imported_rows" integer NOT NULL DEFAULT 0,
        "error_rows" integer NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL,
        "user_id" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_import_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_client_import_status"
          CHECK ("status" IN ('validated', 'imported', 'failed')),
        CONSTRAINT "FK_client_import_user_id" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_client_import_created_at" ON "client_import" ("created_at");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_import_created_at";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_import";`);
  }
}
