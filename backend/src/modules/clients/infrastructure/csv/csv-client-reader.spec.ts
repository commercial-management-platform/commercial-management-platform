import { describe, expect, it } from 'vitest';

import { CsvClientReader } from './csv-client-reader.js';

const read = (text: string) => new CsvClientReader().parse(Buffer.from(text, 'utf8'));

describe('CsvClientReader (CA-03)', () => {
  it('reads a semicolon file saved by Excel in Spanish, with BOM', () => {
    expect(read('﻿nit;business_name\r\n900123456;Ñandú S.A.S\r\n')).toEqual([
      { nit: '900123456', business_name: 'Ñandú S.A.S' },
    ]);
  });

  it('reads a comma file without BOM', () => {
    expect(read('nit,business_name\n900123456,Acme')).toEqual([
      { nit: '900123456', business_name: 'Acme' },
    ]);
  });

  it('keeps the separator and doubled quotes inside a quoted value', () => {
    expect(read('nit;address\n900123456;"Calle 1; local ""B"""')).toEqual([
      { nit: '900123456', address: 'Calle 1; local "B"' },
    ]);
  });

  it('accepts headers typed in any case and skips empty lines', () => {
    expect(read('NIT; Business_Name \n\n900123456;Acme\n')).toEqual([
      { nit: '900123456', business_name: 'Acme' },
    ]);
  });

  it('returns no rows for a file with only the header', () => {
    expect(read('nit;business_name\n')).toEqual([]);
  });
});
