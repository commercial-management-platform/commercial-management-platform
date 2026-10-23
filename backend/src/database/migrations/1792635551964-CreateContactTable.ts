import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `contact` table for HU-04 (client contacts).
 *
 * Hand-written in the same style as CreateClientTable: raw SQL with IF NOT
 * EXISTS and named constraints. The index names must match ContactOrmEntity,
 * otherwise a future migration:generate would drop and recreate them.
 *
 * ON DELETE RESTRICT on client: clients are deactivated, never deleted, while
 * a contact belongs to them.
 *
 * `uq_contact_one_primary_per_client` is a partial unique index: a client can
 * only have one primary contact. The repository demotes the previous primary
 * contact in the same transaction, and this index is the guarantee against a
 * race between two concurrent requests.
 */
export class CreateContactTable1792635551964 implements MigrationInterface {
  name = 'CreateContactTable1792635551964';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contact" (
        "id" SERIAL NOT NULL,
        "client_id" integer NOT NULL,
        "name" varchar NOT NULL,
        "job_title" varchar,
        "phone" varchar,
        "mobile" varchar,
        "email" varchar,
        "is_primary" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contact_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contact_client_id" FOREIGN KEY ("client_id")
          REFERENCES "client" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contact_client_id" ON "contact" ("client_id");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_contact_one_primary_per_client"
        ON "contact" ("client_id") WHERE "is_primary" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "contact";`);
  }
}
