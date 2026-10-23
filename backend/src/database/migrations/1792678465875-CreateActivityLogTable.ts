import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates `activity_log` for HU-16: the history of what is done on each
 * client. Entries are written through the shared ActivityLogPort.
 *
 * Constraint and index names must match ActivityLogOrmEntity, otherwise a
 * future migration:generate would drop and recreate them.
 *
 * - `action` has no CHECK: the list of actions grows with each user story and
 *   is validated by the application (ACTIVITY_ACTIONS).
 * - ON DELETE RESTRICT on both foreign keys: clients and users are
 *   deactivated, never deleted, while they have history.
 * - IDX_activity_log_client_id_created_at serves the history of a client,
 *   newest first.
 * - The trigger makes entries immutable (CA-04): any UPDATE or DELETE fails,
 *   whatever the client that sends it.
 */
export class CreateActivityLogTable1792678465875 implements MigrationInterface {
  name = 'CreateActivityLogTable1792678465875';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "activity_log" (
        "id" SERIAL NOT NULL,
        "client_id" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "action" varchar(50) NOT NULL,
        "user_id" text NOT NULL,
        "description" text NOT NULL,
        CONSTRAINT "PK_activity_log_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_activity_log_client_id" FOREIGN KEY ("client_id")
          REFERENCES "client" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_activity_log_user_id" FOREIGN KEY ("user_id")
          REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_log_client_id_created_at" ON "activity_log" ("client_id", "created_at");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_log_user_id" ON "activity_log" ("user_id");`,
    );

    await queryRunner.query(`
      CREATE FUNCTION "activity_log_reject_change"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'activity_log entries are immutable (% not allowed)', TG_OP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_activity_log_immutable"
        BEFORE UPDATE OR DELETE ON "activity_log"
        FOR EACH ROW EXECUTE FUNCTION "activity_log_reject_change"();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_log";`);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "activity_log_reject_change"();`,
    );
  }
}
