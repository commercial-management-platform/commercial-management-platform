import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRouteTables1792501201377 implements MigrationInterface {
  name = 'CreateRouteTables1792501201377';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE route (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        zone_id INTEGER NOT NULL,
        execution_days VARCHAR,
        frequency VARCHAR,
        suggested_start_time VARCHAR,
        suggested_end_time VARCHAR,
        description VARCHAR,
        advisor_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE route_client (
        id SERIAL PRIMARY KEY,
        route_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        visit_order INTEGER NOT NULL,
        CONSTRAINT uq_route_client_route_client UNIQUE (route_id, client_id),
        CONSTRAINT uq_route_client_route_visit_order UNIQUE (route_id, visit_order) DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT fk_route_client_route FOREIGN KEY (route_id) REFERENCES route (id) ON DELETE CASCADE,
        CONSTRAINT fk_route_client_client FOREIGN KEY (client_id) REFERENCES client (id) ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS route_client`);
    await queryRunner.query(`DROP TABLE IF EXISTS route`);
  }
}
