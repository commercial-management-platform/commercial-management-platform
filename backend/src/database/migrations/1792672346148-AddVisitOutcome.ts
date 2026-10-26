import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the result of a visit for HU-09 (start a visit, confirm location,
 * record its outcome). Extends the `visit` table created by HU-08 and adds
 * `visit_outcome` as its 1:1 result.
 *
 * Constraint, index and CHECK names must match VisitOrmEntity and
 * VisitOutcomeOrmEntity, otherwise a future migration:generate would drop
 * and recreate them.
 *
 * `visit_objective_id` and `visit_type_id` are nullable: a scheduled visit
 * has none until its outcome is recorded, same as the other outcome columns.
 * ON DELETE RESTRICT on both: catalog entries are deactivated, never deleted.
 *
 * `visit_outcome.visit_id` is UNIQUE: a visit has at most one outcome. The
 * use case already guards this through the visit's status (only a
 * `scheduled` visit accepts an outcome), so this is the last-resort
 * guarantee against two concurrent requests.
 */
export class AddVisitOutcome1792672346148 implements MigrationInterface {
  name = 'AddVisitOutcome1792672346148';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "visit"
        ADD "started_at" timestamptz,
        ADD "finished_at" timestamptz,
        ADD "check_in_latitude" numeric(9,6),
        ADD "check_in_longitude" numeric(9,6),
        ADD "check_in_distance_m" integer,
        ADD "location_confirmed" boolean NOT NULL DEFAULT false,
        ADD "visit_objective_id" integer,
        ADD "visit_type_id" integer,
        ADD "interest_level" varchar(10),
        ADD "interest_reason" varchar(20),
        ADD "competitor_mentioned" varchar(255),
        ADD CONSTRAINT "ck_visit_interest_level" CHECK ("interest_level" IN ('high', 'medium', 'low')),
        ADD CONSTRAINT "ck_visit_interest_reason" CHECK ("interest_reason" IN ('quality', 'price', 'quality_price')),
        ADD CONSTRAINT "FK_visit_visit_objective_id" FOREIGN KEY ("visit_objective_id")
          REFERENCES "visit_objective" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_visit_visit_type_id" FOREIGN KEY ("visit_type_id")
          REFERENCES "visit_type" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_visit_visit_objective_id" ON "visit" ("visit_objective_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_visit_visit_type_id" ON "visit" ("visit_type_id");`,
    );

    await queryRunner.query(`
      CREATE TABLE "visit_outcome" (
        "id" SERIAL NOT NULL,
        "visit_id" integer NOT NULL,
        "visit_result_id" integer NOT NULL,
        "observation" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_visit_outcome_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_visit_outcome_visit_id" UNIQUE ("visit_id"),
        CONSTRAINT "FK_visit_outcome_visit_id" FOREIGN KEY ("visit_id")
          REFERENCES "visit" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_visit_outcome_visit_result_id" FOREIGN KEY ("visit_result_id")
          REFERENCES "visit_result" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    // visit_id is already indexed by its own unique constraint.
    await queryRunner.query(
      `CREATE INDEX "IDX_visit_outcome_visit_result_id" ON "visit_outcome" ("visit_result_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "visit_outcome";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visit_visit_type_id";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_visit_visit_objective_id";`,
    );
    await queryRunner.query(`
      ALTER TABLE "visit"
        DROP CONSTRAINT IF EXISTS "FK_visit_visit_type_id",
        DROP CONSTRAINT IF EXISTS "FK_visit_visit_objective_id",
        DROP CONSTRAINT IF EXISTS "ck_visit_interest_reason",
        DROP CONSTRAINT IF EXISTS "ck_visit_interest_level",
        DROP COLUMN IF EXISTS "competitor_mentioned",
        DROP COLUMN IF EXISTS "interest_reason",
        DROP COLUMN IF EXISTS "interest_level",
        DROP COLUMN IF EXISTS "visit_type_id",
        DROP COLUMN IF EXISTS "visit_objective_id",
        DROP COLUMN IF EXISTS "location_confirmed",
        DROP COLUMN IF EXISTS "check_in_distance_m",
        DROP COLUMN IF EXISTS "check_in_longitude",
        DROP COLUMN IF EXISTS "check_in_latitude",
        DROP COLUMN IF EXISTS "finished_at",
        DROP COLUMN IF EXISTS "started_at";
    `);
  }
}
