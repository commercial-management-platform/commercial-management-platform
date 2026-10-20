import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1710000000000 implements MigrationInterface {
  name = 'CreateAuthTables1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "image" text,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "role" text NOT NULL DEFAULT 'advisor',
        "banned" boolean NOT NULL DEFAULT false,
        "banReason" text,
        "banExpires" timestamp,
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_email" UNIQUE ("email")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "token" text NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" text,
        "userAgent" text,
        "userId" text NOT NULL,
        "impersonatedBy" text,
        CONSTRAINT "PK_session_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_session_token" UNIQUE ("token"),
        CONSTRAINT "FK_session_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text NOT NULL,
        "accountId" text NOT NULL,
        "providerId" text NOT NULL,
        "userId" text NOT NULL,
        "accessToken" text,
        "refreshToken" text,
        "idToken" text,
        "accessTokenExpiresAt" timestamp,
        "refreshTokenExpiresAt" timestamp,
        "scope" text,
        "password" text,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_account_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_account_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_verification_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_userId" ON "session" ("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_account_userId" ON "account" ("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_verification_identifier" ON "verification" ("identifier");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "verification";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "account";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "session";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user";`);
  }
}
