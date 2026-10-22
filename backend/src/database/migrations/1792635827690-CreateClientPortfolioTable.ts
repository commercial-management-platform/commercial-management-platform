import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `client_portfolio` table for HU-06 (client portfolios).
 *
 * Hand-written in the same style as CreateContactTable: raw SQL with IF NOT
 * EXISTS and named constraints. The index names must match
 * ClientPortfolioOrmEntity, otherwise a future migration:generate would drop
 * and recreate them.
 *
 * ON DELETE CASCADE on portfolio: deleting a portfolio removes its client
 * list. ON DELETE RESTRICT on client: clients are deactivated, never deleted,
 * while they belong to a portfolio.
 *
 * `uq_client_portfolio_portfolio_client` is a unique index: a client is
 * associated to a portfolio only once. The use case checks it first and this
 * index is the guarantee against a race between two concurrent requests.
 */
export class CreateClientPortfolioTable1792635827690
  implements MigrationInterface
{
  name = 'CreateClientPortfolioTable1792635827690';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_portfolio" (
        "id" SERIAL NOT NULL,
        "portfolio_id" integer NOT NULL,
        "client_id" integer NOT NULL,
        CONSTRAINT "PK_client_portfolio_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_client_portfolio_portfolio_id" FOREIGN KEY ("portfolio_id")
          REFERENCES "portfolio" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_client_portfolio_client_id" FOREIGN KEY ("client_id")
          REFERENCES "client" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_portfolio_client_id"
        ON "client_portfolio" ("client_id");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_client_portfolio_portfolio_client"
        ON "client_portfolio" ("portfolio_id", "client_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "client_portfolio";`);
  }
}
