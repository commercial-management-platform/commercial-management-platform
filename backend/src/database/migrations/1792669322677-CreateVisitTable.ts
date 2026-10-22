import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `visit` table for HU-08 (visit scheduling and agenda).
 *
 * Constraint and index names must match VisitOrmEntity, otherwise a future
 * migration:generate would drop and recreate them.
 *
 * ON DELETE RESTRICT on client, advisor and route: they are deactivated,
 * never deleted, while a visit references them.
 *
 * `status` is scheduled, visited or cancelled. HU-08 creates and cancels
 * visits; HU-09 marks them visited and fills `actual_date`.
 */
export class CreateVisitTable1792669322677 implements MigrationInterface {
  name = 'CreateVisitTable1792669322677';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "visit" (
        "id" SERIAL NOT NULL,
        "client_id" integer NOT NULL,
        "advisor_id" integer NOT NULL,
        "route_id" integer,
        "scheduled_date" timestamptz NOT NULL,
        "visit_order" integer,
        "actual_date" timestamptz,
        "status" varchar(20) NOT NULL DEFAULT 'scheduled',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_visit_id" PRIMARY KEY ("id"),
        CONSTRAINT "ck_visit_status" CHECK ("status" IN ('scheduled', 'visited', 'cancelled')),
        CONSTRAINT "FK_visit_client_id" FOREIGN KEY ("client_id")
          REFERENCES "client" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_visit_advisor_id" FOREIGN KEY ("advisor_id")
          REFERENCES "advisor" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_visit_route_id" FOREIGN KEY ("route_id")
          REFERENCES "route" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    // Agenda of an advisor: visits of one advisor within a date range.
    await queryRunner.query(
      `CREATE INDEX "IDX_visit_advisor_id_scheduled_date" ON "visit" ("advisor_id", "scheduled_date");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_visit_client_id" ON "visit" ("client_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_visit_route_id" ON "visit" ("route_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_visit_status" ON "visit" ("status");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visit_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visit_route_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visit_client_id";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_visit_advisor_id_scheduled_date";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "visit";`);
  }
}
