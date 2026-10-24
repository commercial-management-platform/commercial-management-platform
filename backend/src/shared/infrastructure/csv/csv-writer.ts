/**
 * CSV generator shared by every report (HU-17).
 *
 * - Semicolon separator: Excel in Spanish (Colombian regional settings) uses
 *   it as list separator, so with commas it opens every row in one column.
 * - RFC 4180 otherwise: CRLF line endings, a field with the separator, a
 *   comma, a double quote, CR or LF goes between double quotes and its quotes
 *   doubled.
 * - UTF-8 with BOM, so Excel shows accents and ñ correctly.
 * - Spreadsheet formula injection (OWASP "CSV injection"): a text value that
 *   starts with =, +, -, @, tab or CR gets a leading apostrophe, so Excel does
 *   not run it. Numbers, and text that is a plain decimal number, are
 *   written as they are.
 * - Produced in chunks from an AsyncIterable, so a large report is never held
 *   in memory as a whole.
 */
export const UTF8_BOM = '﻿';
export const CSV_LINE_END = '\r\n';
export const CSV_SEPARATOR = ';';

/** null and undefined are written as an empty field. */
export type CsvValue = string | number | null | undefined;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

// Commas are quoted too, so the file also reads well where they separate.
const NEEDS_QUOTES = /[";,\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;
// A plain number cannot be a formula, so "-5" keeps its sign.
const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;

export function escapeCsvField(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new RangeError(`Cannot write ${value} to a CSV field`);
    }
    return String(value);
  }
  const text =
    FORMULA_START.test(value) && !PLAIN_DECIMAL.test(value)
      ? `'${value}`
      : value;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsvLine(values: readonly CsvValue[]): string {
  return values.map(escapeCsvField).join(CSV_SEPARATOR) + CSV_LINE_END;
}

/**
 * A PostgreSQL numeric (sent by the driver as text, to keep its precision)
 * as a plain number: no currency symbol, '.' as decimal separator and no
 * trailing zeros. '1500000.500000' -> '1500000.5', '42.000000' -> '42'.
 */
export function formatCsvDecimal(value: string | null): string | null {
  if (value === null) return null;
  if (!PLAIN_DECIMAL.test(value)) {
    throw new RangeError(`'${value}' is not a decimal number`);
  }
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}

/** Lines are grouped up to this size before being yielded. */
const DEFAULT_CHUNK_SIZE = 64 * 1024;

/**
 * Yields the BOM and the header line first, then the rows in chunks of about
 * `chunkSize` characters. Stopping the iteration (the client aborts the
 * download) also stops the source of rows.
 */
export async function* generateCsv<T>(
  columns: readonly CsvColumn<T>[],
  rows: AsyncIterable<T>,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): AsyncGenerator<string> {
  yield UTF8_BOM + toCsvLine(columns.map((column) => column.header));

  let chunk = '';
  for await (const row of rows) {
    chunk += toCsvLine(columns.map((column) => column.value(row)));
    if (chunk.length >= chunkSize) {
      yield chunk;
      chunk = '';
    }
  }
  if (chunk.length > 0) {
    yield chunk;
  }
}
