import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `route` and `route_client` for HU-07 (commercial routes).
 *
 * Constraint and index names must match RouteOrmEntity and
 * RouteClientOrmEntity, otherwise a future migration:generate would drop and
 * recreate them.
 *
 * ON DELETE RESTRICT on zone, advisor and client: they are deactivated, never
 * deleted, while a route uses them. Deleting a route removes its client list.
 *
 * TypeOrmAdvisorClientAccessAdapter (clients module) reads advisor visibility
 * through route_client.route_id, route.advisor_id and advisor.user_id.
 */
export class CreateRouteTables1792617769096 implements MigrationInterface {
  name = 'CreateRouteTables1792617769096';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "route" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar NOT NULL,
        "zone_id" integer NOT NULL,
        "execution_days" varchar,
        "frequency" varchar,
        "suggested_start_time" varchar,
        "suggested_end_time" varchar,
        "description" varchar,
        "advisor_id" integer NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date,
        "status" varchar NOT NULL,
        CONSTRAINT "FK_route_zone_id" FOREIGN KEY ("zone_id")
          REFERENCES "zone" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_route_advisor_id" FOREIGN KEY ("advisor_id")
          REFERENCES "advisor" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_route_zone_id" ON "route" ("zone_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_route_advisor_id" ON "route" ("advisor_id");`,
    );

    await queryRunner.query(`
      CREATE TABLE "route_client" (
        "id" SERIAL PRIMARY KEY,
        "route_id" integer NOT NULL,
        "client_id" integer NOT NULL,
        "visit_order" integer NOT NULL,
        CONSTRAINT "uq_route_client_route_client" UNIQUE ("route_id", "client_id"),
        CONSTRAINT "uq_route_client_route_visit_order" UNIQUE ("route_id", "visit_order") DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT "fk_route_client_route" FOREIGN KEY ("route_id")
          REFERENCES "route" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "fk_route_client_client" FOREIGN KEY ("client_id")
          REFERENCES "client" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    // route_id is already the leading column of uq_route_client_route_client.
    await queryRunner.query(
      `CREATE INDEX "IDX_route_client_client_id" ON "route_client" ("client_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_route_client_client_id";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "route_client";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_route_advisor_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_route_zone_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route";`);
  }
}
