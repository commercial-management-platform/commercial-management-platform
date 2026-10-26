import type { DataSource } from 'typeorm';

/** Rows fetched from the cursor in each round trip. */
export const DEFAULT_CURSOR_BATCH_SIZE = 500;

/**
 * Runs `sql` through a PostgreSQL cursor and yields its rows one by one,
 * fetching `batchSize` at a time, so a large result is never held in memory
 * (HU-17 CSV exports). No extra dependency: DECLARE/FETCH on a dedicated
 * connection.
 *
 * The cursor lives in a read-only REPEATABLE READ transaction, so every batch
 * sees the same snapshot. The connection is held while the caller iterates
 * and is always released: at the end, on an error, or when the caller stops
 * early (for example, the client aborts the download).
 *
 * `sql` must be a SELECT with $1, $2... placeholders; values go in `params`.
 */
export async function* queryWithCursor<T>(
  dataSource: DataSource,
  sql: string,
  params: readonly unknown[] = [],
  batchSize: number = DEFAULT_CURSOR_BATCH_SIZE,
): AsyncGenerator<T> {
  const runner = dataSource.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction('REPEATABLE READ');
    await runner.query('SET TRANSACTION READ ONLY');
    await runner.query(`DECLARE export_cursor NO SCROLL CURSOR FOR ${sql}`, [
      ...params,
    ]);

    for (;;) {
      const rows: T[] = await runner.query(
        `FETCH ${batchSize} FROM export_cursor`,
      );
      for (const row of rows) {
        yield row;
      }
      if (rows.length < batchSize) break;
    }

    await runner.commitTransaction();
  } finally {
    if (runner.isTransactionActive) {
      await runner.rollbackTransaction();
    }
    await runner.release();
  }
}
