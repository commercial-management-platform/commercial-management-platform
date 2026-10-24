import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'node:stream';

import { businessToday } from '../../../../shared/domain/time/business-time.js';
import {
  generateCsv,
  type CsvColumn,
} from '../../../../shared/infrastructure/csv/csv-writer.js';
import { prefetchFirst } from '../../../../shared/infrastructure/streaming/prefetch-first.js';

/** `seguimiento-visitas` -> `seguimiento-visitas-2026-10-26.csv` (CA-06). */
export function reportFileName(report: string, today = businessToday()): string {
  return `${report}-${today}.csv`;
}

/**
 * Streams `rows` as a CSV download (CA-07). The first row is read before
 * the headers are sent, so a failing query is still an error response.
 * When the client closes the connection the stream is destroyed, which stops
 * the query and releases its database connection.
 */
export async function csvFile<T>(
  response: Response,
  report: string,
  columns: readonly CsvColumn<T>[],
  rows: AsyncIterable<T>,
): Promise<StreamableFile> {
  const stream = Readable.from(generateCsv(columns, await prefetchFirst(rows)));
  response.once('close', () => stream.destroy());
  response.setHeader('Cache-Control', 'no-store');

  return new StreamableFile(stream, {
    type: 'text/csv; charset=utf-8',
    disposition: `attachment; filename="${reportFileName(report)}"`,
  });
}
