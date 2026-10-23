import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates HU-14 sales orders and their concurrency-safe PED sequence. */
export class CreateSalesOrderTable1792679000000 implements MigrationInterface {
  name = 'CreateSalesOrderTable1792679000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE SEQUENCE "sales_order_number_seq" START WITH 1 INCREMENT BY 1;`,
    );
    await queryRunner.query(`
      CREATE TABLE "sales_order" (
        "id" SERIAL NOT NULL,
        "number" varchar(20) NOT NULL,
        "client_id" integer NOT NULL,
        "quote_id" integer,
        "visit_id" integer,
        "advisor_id" integer NOT NULL,
        "date" date NOT NULL,
        "value" numeric(18,6) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "estimated_delivery_date" date NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales_order_id" PRIMARY KEY ("id"),
        CONSTRAINT "ck_sales_order_value_non_negative" CHECK ("value" >= 0),
        CONSTRAINT "FK_sales_order_client_id" FOREIGN KEY ("client_id") REFERENCES "client" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_sales_order_quote_id" FOREIGN KEY ("quote_id") REFERENCES "quote" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_sales_order_visit_id" FOREIGN KEY ("visit_id") REFERENCES "visit" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_sales_order_advisor_id" FOREIGN KEY ("advisor_id") REFERENCES "advisor" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sales_order_number" ON "sales_order" ("number");`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sales_order_quote_id" ON "sales_order" ("quote_id") WHERE "quote_id" IS NOT NULL;`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_order_client_id_date" ON "sales_order" ("client_id", "date");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_order_advisor_id_date" ON "sales_order" ("advisor_id", "date");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_order_status" ON "sales_order" ("status");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_order_visit_id" ON "sales_order" ("visit_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "sales_order";`);
    await queryRunner.query(
      `DROP SEQUENCE IF EXISTS "sales_order_number_seq";`,
    );
  }
}
