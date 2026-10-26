import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `advisor` table, linked one-to-one to the betterAuth user.
 *
 * Constraint names must match AdvisorOrmEntity. The foreign key has no
 * ON DELETE CASCADE: routes and visits will reference advisor, so a user with
 * an advisor record must not be deleted (it is deactivated instead).
 */
export class CreateAdvisorTable1710000000002 implements MigrationInterface {
  name = 'CreateAdvisorTable1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "advisor" (
        "id" SERIAL NOT NULL,
        "user_id" text NOT NULL,
        "name" varchar NOT NULL,
        "email" varchar NOT NULL,
        "phone" varchar,
        "status" varchar NOT NULL DEFAULT 'active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_advisor_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_advisor_user_id" UNIQUE ("user_id"),
        CONSTRAINT "ck_advisor_status" CHECK ("status" IN ('active', 'inactive')),
        CONSTRAINT "fk_advisor_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "advisor";`);
  }
}
