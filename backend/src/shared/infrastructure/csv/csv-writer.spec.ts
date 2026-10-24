import { describe, expect, it } from 'vitest';

import {
  escapeCsvField,
  formatCsvDecimal,
  generateCsv,
  toCsvLine,
  UTF8_BOM,
  type CsvColumn,
} from './csv-writer.js';

async function collect(chunks: AsyncIterable<string>): Promise<string[]> {
  const result: string[] = [];
  for await (const chunk of chunks) result.push(chunk);
  return result;
}

async function* fromArray<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) yield item;
}

interface Row {
  name: string;
  amount: number | null;
}

const columns: CsvColumn<Row>[] = [
  { header: 'Nombre', value: (row) => row.name },
  { header: 'Monto', value: (row) => row.amount },
];

describe('escapeCsvField (RFC 4180)', () => {
  it.each([
    ['plain text', 'Ferretería Ñandú', 'Ferretería Ñandú'],
    ['a comma', 'Cra 7, local 2', '"Cra 7, local 2"'],
    ['a semicolon', 'Bodega 3; piso 2', '"Bodega 3; piso 2"'],
    ['a double quote', 'El "Tornillo"', '"El ""Tornillo"""'],
    ['a line break', 'line 1\nline 2', '"line 1\nline 2"'],
    ['a CRLF', 'a\r\nb', '"a\r\nb"'],
  ])('writes %s', (_, value, expected) => {
    expect(escapeCsvField(value)).toBe(expected);
  });

  it('writes null and undefined as an empty field', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('writes numbers as they are, without currency or thousands separator', () => {
    expect(escapeCsvField(1500000)).toBe('1500000');
    expect(escapeCsvField(0.5)).toBe('0.5');
    expect(escapeCsvField(-3)).toBe('-3');
  });

  it('rejects NaN and Infinity instead of writing garbage', () => {
    expect(() => escapeCsvField(Number.NaN)).toThrow(RangeError);
    expect(() => escapeCsvField(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it.each([
    ['=HYPERLINK("http://x")', `"'=HYPERLINK(""http://x"")"`],
    ['+57 300', "'+57 300"],
    ['-cmd', "'-cmd"],
    ['@SUM(A1)', "'@SUM(A1)"],
  ])('neutralizes the spreadsheet formula %s', (value, expected) => {
    expect(escapeCsvField(value)).toBe(expected);
  });

  it('keeps the sign of a text that is a plain number', () => {
    expect(escapeCsvField('-1500.25')).toBe('-1500.25');
  });
});

describe('toCsvLine', () => {
  it('joins with semicolons (Excel in Spanish) and ends with CRLF', () => {
    expect(toCsvLine(['a', 1, null, 'b,c'])).toBe('a;1;;"b,c"\r\n');
  });
});

describe('formatCsvDecimal', () => {
  it.each([
    ['1500000.000000', '1500000'],
    ['1500000.500000', '1500000.5'],
    ['42', '42'],
    ['0.000000', '0'],
    ['10.010', '10.01'],
  ])('writes %s as %s', (value, expected) => {
    expect(formatCsvDecimal(value)).toBe(expected);
  });

  it('keeps null as an empty value', () => {
    expect(formatCsvDecimal(null)).toBeNull();
  });

  it('rejects a value that is not a number', () => {
    expect(() => formatCsvDecimal('$ 1.500')).toThrow(RangeError);
  });
});

describe('generateCsv', () => {
  it('starts with the UTF-8 BOM and the Spanish headers', async () => {
    const csv = (await collect(generateCsv(columns, fromArray<Row>([])))).join('');

    expect(csv).toBe(`${UTF8_BOM}Nombre;Monto\r\n`);
    expect(Buffer.from(csv, 'utf8').subarray(0, 3)).toEqual(
      Buffer.from([0xef, 0xbb, 0xbf]),
    );
  });

  it('writes one escaped line per row', async () => {
    const csv = (
      await collect(
        generateCsv(
          columns,
          fromArray([
            { name: 'Acme, S.A.S', amount: 1200.5 },
            { name: 'Sin monto', amount: null },
          ]),
        ),
      )
    ).join('');

    expect(csv).toBe(
      `${UTF8_BOM}Nombre;Monto\r\n"Acme, S.A.S";1200.5\r\nSin monto;\r\n`,
    );
  });

  it('yields in chunks without reading every row first (CA-07)', async () => {
    let produced = 0;
    async function* endless(): AsyncGenerator<Row> {
      for (;;) {
        produced++;
        yield { name: 'x'.repeat(10), amount: produced };
      }
    }

    const chunks = generateCsv(columns, endless(), 100);
    const header = await chunks.next();
    expect(header.value).toBe(`${UTF8_BOM}Nombre;Monto\r\n`);
    expect(produced).toBe(0);

    const firstChunk = await chunks.next();
    expect(firstChunk.value.length).toBeGreaterThanOrEqual(100);
    expect(produced).toBeLessThan(20);

    await chunks.return(undefined);
  });

  it('stops the source of rows when the consumer stops early', async () => {
    let closed = false;
    async function* source(): AsyncGenerator<Row> {
      try {
        for (;;) yield { name: 'row', amount: 1 };
      } finally {
        closed = true;
      }
    }

    const chunks = generateCsv(columns, source(), 10);
    await chunks.next();
    await chunks.next();
    await chunks.return(undefined);

    expect(closed).toBe(true);
  });
});
