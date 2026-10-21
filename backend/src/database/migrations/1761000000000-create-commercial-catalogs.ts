import { MigrationInterface, QueryRunner, Table } from 'typeorm';

const catalogTables = [
  ['ZONE', 'id_zone'],
  ['CLIENT_TYPE', 'id_client_type'],
  ['CLIENT_STATUS', 'id_client_status'],
  ['VISIT_RESULT', 'id_visit_result'],
  ['VISIT_OBJECTIVE', 'id_visit_objective'],
  ['VISIT_TYPE', 'id_visit_type'],
] as const;

export class CreateCommercialCatalogs1761000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [tableName, idColumn] of catalogTables) {
      await queryRunner.createTable(
        new Table({
          name: tableName,
          columns: [
            {
              name: idColumn,
              type: 'integer',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'name', type: 'varchar', isUnique: true },
            { name: 'active', type: 'boolean', default: 'true' },
          ],
        }),
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "UQ_${tableName}_name_lower" ON "${tableName}" (LOWER("name"))`,
      );
    }

    await queryRunner.createTable(
      new Table({
        name: 'CLIENT_POTENTIAL',
        columns: [
          {
            name: 'id_client_potential',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar', isUnique: true },
          { name: 'catalog_order', type: 'integer' },
          { name: 'active', type: 'boolean', default: 'true' },
        ],
      }),
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_CLIENT_POTENTIAL_name_lower" ON "CLIENT_POTENTIAL" (LOWER("name"))',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('CLIENT_POTENTIAL');

    for (const [tableName] of [...catalogTables].reverse()) {
      await queryRunner.dropTable(tableName);
    }
  }
}
