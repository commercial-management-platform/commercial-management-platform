import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates quotes for HU-12. Value starts at zero and is updated only by
 * HU-13 quote details. The PostgreSQL sequence gives each inserted quote a
 * unique, concurrency-safe COT-xxxx number.
 */
export class CreateQuoteTable1792678465876 implements MigrationInterface {
  name = 'CreateQuoteTable1792678465876';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE "quote_number_seq" START WITH 1 INCREMENT BY 1;`,
    );
    await queryRunner.query(`
      CREATE TABLE "quote" (
        "id" SERIAL NOT NULL,
        "number" varchar(20) NOT NULL,
        "client_id" integer NOT NULL,
        "advisor_id" integer NOT NULL,
        "visit_id" integer,
        "date" date NOT NULL,
        "value" numeric(14,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'COP',
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "document_key" varchar(512),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quote_id" PRIMARY KEY ("id"),
        CONSTRAINT "ck_quote_value_non_negative" CHECK ("value" >= 0),
        CONSTRAINT "FK_quote_client_id" FOREIGN KEY ("client_id")
          REFERENCES "client" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_quote_advisor_id" FOREIGN KEY ("advisor_id")
          REFERENCES "advisor" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_quote_visit_id" FOREIGN KEY ("visit_id")
          REFERENCES "visit" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_quote_number" ON "quote" ("number");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_client_id_date" ON "quote" ("client_id", "date");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_advisor_id_date" ON "quote" ("advisor_id", "date");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_status" ON "quote" ("status");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_visit_id" ON "quote" ("visit_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "quote";`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "quote_number_seq";`);
  }
}
