import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates HU-13 quote details and preserves exact calculated totals. */
export class CreateQuoteDetailTable1792678465877 implements MigrationInterface {
  name = 'CreateQuoteDetailTable1792678465877';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "quote"
        ALTER COLUMN "value" TYPE numeric(18,6)
        USING "value"::numeric(18,6);
    `);
    await queryRunner.query(`
      CREATE TABLE "quote_detail" (
        "id" SERIAL NOT NULL,
        "quote_id" integer NOT NULL,
        "product" varchar(255) NOT NULL,
        "quantity" numeric(14,3) NOT NULL,
        "price" numeric(14,3) NOT NULL,
        "subtotal" numeric(18,6) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quote_detail_id" PRIMARY KEY ("id"),
        CONSTRAINT "ck_quote_detail_quantity_positive" CHECK ("quantity" > 0),
        CONSTRAINT "ck_quote_detail_price_non_negative" CHECK ("price" >= 0),
        CONSTRAINT "ck_quote_detail_subtotal_non_negative" CHECK ("subtotal" >= 0),
        CONSTRAINT "FK_quote_detail_quote_id" FOREIGN KEY ("quote_id")
          REFERENCES "quote" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_quote_detail_quote_id" ON "quote_detail" ("quote_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "quote_detail";`);
    await queryRunner.query(`
      ALTER TABLE "quote"
        ALTER COLUMN "value" TYPE numeric(14,2)
        USING round("value", 2);
    `);
  }
}
