import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { DataSource, type MigrationInterface } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UserRole } from '../src/modules/auth/domain/types/user-role.enum.js';
import { GetDashboardKpisUseCase } from '../src/modules/dashboard/application/use-cases/get-dashboard-kpis.use-case.js';
import { effectiveness } from '../src/modules/dashboard/domain/entities/commercial-kpis.js';
import { TypeOrmDashboardReadAdapter } from '../src/modules/dashboard/infrastructure/persistence/typeorm-dashboard-read.adapter.js';

// Dashboard indicators (HU-15 CA-09) computed by the real SQL on PostgreSQL,
// with a small data set whose expected values are worked out by hand below.
//
// It needs a PostgreSQL server (the one of docker-compose.yml). It creates
// its own throwaway database, applies every migration and drops it at the
// end, so it never touches the development data. Without a server the suite
// is skipped. TEST_DB_HOST/PORT/USER/PASSWORD override the DB_* variables.

const server = {
  host: process.env.TEST_DB_HOST ?? process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.TEST_DB_PORT ?? process.env.DB_PORT ?? 5432),
  user: process.env.TEST_DB_USER ?? process.env.DB_USER,
  password: process.env.TEST_DB_PASSWORD ?? process.env.DB_PASSWORD,
};
const ADMIN_DATABASE = process.env.DB_NAME ?? 'postgres';
const TEST_DATABASE = 'cmp_dashboard_kpis_test';

async function serverAvailable(): Promise<boolean> {
  const client = new pg.Client({ ...server, database: ADMIN_DATABASE });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function adminQuery(sql: string): Promise<void> {
  const client = new pg.Client({ ...server, database: ADMIN_DATABASE });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

/** Every migration class of src/database/migrations, in file order. */
async function loadMigrations(): Promise<(new () => MigrationInterface)[]> {
  const dir = join(import.meta.dirname, '../src/database/migrations');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .sort();
  const classes: (new () => MigrationInterface)[] = [];
  for (const file of files) {
    const module = (await import(
      pathToFileURL(join(dir, file)).href
    )) as Record<string, unknown>;
    for (const value of Object.values(module)) {
      if (typeof value === 'function')
        classes.push(value as new () => MigrationInterface);
    }
  }
  return classes;
}

const available = await serverAvailable();
if (!available) {
  console.warn(
    `[dashboard-kpis] PostgreSQL not reachable at ${server.host}:${server.port}: suite skipped`,
  );
}

describe.skipIf(!available)(
  'Dashboard indicators on PostgreSQL (HU-15 CA-09) - e2e',
  () => {
    let dataSource: DataSource;
    let useCase: GetDashboardKpisUseCase;
    const ids = { norte: 0, sur: 0, advisor1: 0, advisor2: 0 };

    const director = { id: 'usr_director', role: UserRole.Director };
    const advisor1User = { id: 'usr_advisor_1', role: UserRole.Advisor };

    beforeAll(async () => {
      await adminQuery(
        `DROP DATABASE IF EXISTS "${TEST_DATABASE}" WITH (FORCE)`,
      );
      await adminQuery(`CREATE DATABASE "${TEST_DATABASE}"`);
      dataSource = new DataSource({
        type: 'postgres',
        ...server,
        username: server.user,
        database: TEST_DATABASE,
        migrations: await loadMigrations(),
        migrationsTableName: 'migrations',
      });
      await dataSource.initialize();
      await dataSource.runMigrations();
      await seed();
      useCase = new GetDashboardKpisUseCase(
        new TypeOrmDashboardReadAdapter(dataSource),
      );
    }, 120_000);

    afterAll(async () => {
      await dataSource?.destroy();
      await adminQuery(
        `DROP DATABASE IF EXISTS "${TEST_DATABASE}" WITH (FORCE)`,
      );
    });

    const q = <T>(sql: string, params: unknown[] = []) =>
      dataSource.query<T>(sql, params);
    const insertId = async (sql: string, params: unknown[]) =>
      (await q<{ id: number }[]>(`${sql} RETURNING "id"`, params))[0].id;

    /**
     * Two zones (Norte with clients c1 and c2, Sur with c3) and two advisors.
     * Week under test: Monday 2026-10-19 to Sunday 2026-10-25, America/Bogota.
     * Times carry the Bogota offset (-05:00) on purpose: three visits fall on a
     * different UTC day than in Bogota.
     */
    async function seed(): Promise<void> {
      ids.norte = await insertId(
        `INSERT INTO "zone" ("name") VALUES ('Norte')`,
        [],
      );
      ids.sur = await insertId(
        `INSERT INTO "zone" ("name") VALUES ('Sur')`,
        [],
      );
      const client = (nit: string, zone: number) =>
        insertId(
          `INSERT INTO "client" ("nit", "business_name", "zone_id") VALUES ($1, $2, $3)`,
          [nit, `Client ${nit}`, zone],
        );
      const c1 = await client('900000001', ids.norte);
      const c2 = await client('900000002', ids.norte);
      const c3 = await client('900000003', ids.sur);

      const advisor = async (userId: string) => {
        const email = `${userId}@test.co`;
        await q(
          `INSERT INTO "user" ("id", "name", "email") VALUES ($1, $2, $3)`,
          [userId, userId, email],
        );
        return insertId(
          `INSERT INTO "advisor" ("user_id", "name", "email") VALUES ($1, $2, $3)`,
          [userId, userId, email],
        );
      };
      ids.advisor1 = await advisor(advisor1User.id);
      ids.advisor2 = await advisor('usr_advisor_2');
      const { advisor1: a1, advisor2: a2 } = ids;

      const visit = (
        advisorId: number,
        clientId: number,
        at: string,
        status: string,
      ) =>
        q(
          `INSERT INTO "visit" ("advisor_id", "client_id", "scheduled_date", "status") VALUES ($1, $2, $3, $4)`,
          [advisorId, clientId, at, status],
        );
      await visit(a1, c1, '2026-10-19T00:30:00-05:00', 'visited'); // Monday 00:30 (05:30Z): first minutes of the week
      await visit(a1, c1, '2026-10-20T09:00:00-05:00', 'visited');
      await visit(a1, c2, '2026-10-21T10:00:00-05:00', 'scheduled');
      await visit(a1, c2, '2026-10-22T10:00:00-05:00', 'cancelled'); // not counted
      await visit(a2, c3, '2026-10-25T23:30:00-05:00', 'visited'); // Sunday 23:30 = Monday 04:30Z: still this week
      await visit(a2, c3, '2026-10-18T23:30:00-05:00', 'visited'); // Sunday 18 = Monday 19 04:30Z: previous week
      await visit(a1, c1, '2026-10-26T00:30:00-05:00', 'visited'); // next week

      let quoteNumber = 0;
      const quote = (
        advisorId: number,
        clientId: number,
        date: string,
        value: string,
      ) =>
        q(
          `INSERT INTO "quote" ("number", "advisor_id", "client_id", "date", "value") VALUES ($1, $2, $3, $4, $5)`,
          [`COT-T${++quoteNumber}`, advisorId, clientId, date, value],
        );
      await quote(a1, c1, '2026-10-19', '1000.50');
      await quote(a2, c3, '2026-10-25', '500');
      await quote(a1, c2, '2026-10-26', '9999'); // next week
      await quote(a1, c1, '2026-10-18', '300'); // previous week

      let orderNumber = 0;
      const order = (
        advisorId: number,
        clientId: number,
        date: string,
        status: string,
        value: string,
      ) =>
        q(
          `INSERT INTO "sales_order" ("number", "advisor_id", "client_id", "date", "status", "value", "estimated_delivery_date")
         VALUES ($1, $2, $3, $4, $5, $6, $4::date + 5)`,
          [`PED-T${++orderNumber}`, advisorId, clientId, date, status, value],
        );
      await order(a1, c1, '2026-10-20', 'confirmed', '800');
      await order(a2, c3, '2026-10-25', 'delivered', '400');
      await order(a1, c2, '2026-10-21', 'pending', '300'); // not closed
      await order(a1, c1, '2026-10-22', 'cancelled', '100'); // not closed
      await order(a1, c1, '2026-10-18', 'confirmed', '7777'); // previous week
    }

    /** Numeric view of the indicators: the sums come from PostgreSQL as text. */
    const numbers = (kpis: {
      scheduledVisits: number;
      completedVisits: number;
      quotedValue: string;
      closedOrders: number;
      billedValue: string;
    }) => ({
      scheduledVisits: kpis.scheduledVisits,
      completedVisits: kpis.completedVisits,
      effectiveness: effectiveness(kpis),
      quotedValue: Number(kpis.quotedValue),
      closedOrders: kpis.closedOrders,
      billedValue: Number(kpis.billedValue),
    });

    it('computes every indicator of the week for all advisors', async () => {
      const result = await useCase.execute(director, { week: '2026-10-22' });

      expect(result.week).toEqual({
        from: '2026-10-19',
        to: '2026-10-25',
        isoWeek: 43,
      });
      // Visits: 4 not cancelled (the Sunday 23:30 one included), 3 visited.
      // Quotes: 1000.50 + 500. Closed orders: confirmed 800 + delivered 400.
      expect(numbers(result.current)).toEqual({
        scheduledVisits: 4,
        completedVisits: 3,
        effectiveness: 75,
        quotedValue: 1500.5,
        closedOrders: 2,
        billedValue: 1200,
      });
    });

    it('puts the Sunday 23:30 visit of the week before in the previous week (Bogota time)', async () => {
      const { previous } = await useCase.execute(director, {
        week: '2026-10-22',
      });

      expect(numbers(previous)).toEqual({
        scheduledVisits: 1,
        completedVisits: 1,
        effectiveness: 100,
        quotedValue: 300,
        closedOrders: 1,
        billedValue: 7777,
      });
    });

    it('filters by zone (CA-03)', async () => {
      const norte = await useCase.execute(director, {
        week: '2026-10-22',
        zoneId: ids.norte,
      });
      const sur = await useCase.execute(director, {
        week: '2026-10-22',
        zoneId: ids.sur,
      });

      expect(numbers(norte.current)).toEqual({
        scheduledVisits: 3,
        completedVisits: 2,
        effectiveness: 67,
        quotedValue: 1000.5,
        closedOrders: 1,
        billedValue: 800,
      });
      expect(numbers(sur.current)).toEqual({
        scheduledVisits: 1,
        completedVisits: 1,
        effectiveness: 100,
        quotedValue: 500,
        closedOrders: 1,
        billedValue: 400,
      });
    });

    it('filters by advisor for a director (CA-03)', async () => {
      const result = await useCase.execute(director, {
        week: '2026-10-22',
        advisorId: ids.advisor2,
      });

      expect(numbers(result.current)).toEqual({
        scheduledVisits: 1,
        completedVisits: 1,
        effectiveness: 100,
        quotedValue: 500,
        closedOrders: 1,
        billedValue: 400,
      });
    });

    it('only gives an advisor their own indicators, whatever advisorId they send (CA-03)', async () => {
      const result = await useCase.execute(advisor1User, {
        week: '2026-10-22',
        advisorId: ids.advisor2,
      });

      expect(numbers(result.current)).toEqual({
        scheduledVisits: 3,
        completedVisits: 2,
        effectiveness: 67,
        quotedValue: 1000.5,
        closedOrders: 1,
        billedValue: 800,
      });
    });

    it('returns zeros for a week without data', async () => {
      const result = await useCase.execute(director, { week: '2026-11-04' });

      expect(numbers(result.current)).toEqual({
        scheduledVisits: 0,
        completedVisits: 0,
        effectiveness: 0,
        quotedValue: 0,
        closedOrders: 0,
        billedValue: 0,
      });
    });
  },
);
