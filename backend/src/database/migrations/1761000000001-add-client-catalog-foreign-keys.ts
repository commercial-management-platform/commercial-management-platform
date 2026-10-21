import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Links `client` to the catalogs created by HU-05: one foreign key and one
 * index per catalog column. Names must match ClientOrmEntity, otherwise a
 * future migration:generate would drop and recreate them.
 *
 * Before HU-05 the clients module only checked the shape of the catalog ids,
 * so a client may point to an id that does not exist. Those ids are cleared
 * (set to NULL) so the foreign keys can be created.
 *
 * ON DELETE RESTRICT: catalog entries are deactivated, never deleted, while
 * a client uses them.
 */
const CLIENT_CATALOGS = [
  { column: 'zone_id', table: 'zone' },
  { column: 'client_type_id', table: 'client_type' },
  { column: 'client_potential_id', table: 'client_potential' },
  { column: 'client_status_id', table: 'client_status' },
] as const;

export class AddClientCatalogForeignKeys1761000000001 implements MigrationInterface {
  name = 'AddClientCatalogForeignKeys1761000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { column, table } of CLIENT_CATALOGS) {
      await queryRunner.query(`
        UPDATE "client" SET "${column}" = NULL
        WHERE "${column}" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "${table}" WHERE "id" = "client"."${column}");
      `);
      await queryRunner.query(`
        ALTER TABLE "client"
          ADD CONSTRAINT "FK_client_${column}"
          FOREIGN KEY ("${column}") REFERENCES "${table}" ("id")
          ON DELETE RESTRICT ON UPDATE NO ACTION;
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_client_${column}" ON "client" ("${column}");`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { column } of [...CLIENT_CATALOGS].reverse()) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_${column}";`);
      await queryRunner.query(
        `ALTER TABLE "client" DROP CONSTRAINT IF EXISTS "FK_client_${column}";`,
      );
    }
  }
}
