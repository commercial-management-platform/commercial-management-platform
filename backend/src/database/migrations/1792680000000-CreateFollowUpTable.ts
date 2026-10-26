import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `follow_up` table for HU-10 (manage commercial follow-ups).
 *
 * Constraint and index names must match FollowUpOrmEntity, otherwise a future
 * migration:generate would drop and recreate them.
 *
 * ON DELETE RESTRICT on visit and advisor: they are deactivated/kept while
 * follow-ups reference them.
 *
 * - next_date is required.
 * - next_time is optional (HH:mm style stored as time without time zone or varchar; using time).
 * - responsible_advisor_id references advisor.id.
 * - completed is false by default; completed_at set when completed.
 */
export class CreateFollowUpTable1792680000000 implements MigrationInterface {
  name = 'CreateFollowUpTable1792680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "follow_up" (
        "id" SERIAL NOT NULL,
        "visit_id" integer NOT NULL,
        "next_date" date NOT NULL,
        "next_time" time,
        "activity" varchar(255) NOT NULL,
        "observation" text,
        "responsible_advisor_id" integer NOT NULL,
        "completed" boolean NOT NULL DEFAULT false,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follow_up_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_follow_up_visit_id" FOREIGN KEY ("visit_id")
          REFERENCES "visit" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_follow_up_responsible_advisor_id" FOREIGN KEY ("responsible_advisor_id")
          REFERENCES "advisor" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_up_visit_id" ON "follow_up" ("visit_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_up_responsible_advisor_id" ON "follow_up" ("responsible_advisor_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_up_next_date" ON "follow_up" ("next_date");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_follow_up_completed" ON "follow_up" ("completed");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_follow_up_completed";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_follow_up_next_date";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_follow_up_responsible_advisor_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_follow_up_visit_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_up";`);
  }
}
