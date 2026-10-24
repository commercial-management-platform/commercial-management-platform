import { describe, expect, it } from 'vitest';

import { VisitStatus } from '../../../visits/domain/visit-status.js';
import type {
  QuoteReportRow,
  SalesOrderReportRow,
  VisitTrackingRow,
} from '../../domain/entities/report-rows.js';
import { reportFileName } from './csv-file.js';
import {
  QUOTE_COLUMNS,
  SALES_ORDER_COLUMNS,
  VISIT_TRACKING_COLUMNS,
} from './report-columns.js';

const values = <T>(columns: { value: (row: T) => unknown }[], row: T) =>
  columns.map((column) => column.value(row));

describe('report columns', () => {
  it('has the same columns as the dashboard tracking table (CA-01)', () => {
    expect(VISIT_TRACKING_COLUMNS.map((c) => c.header)).toEqual([
      'Fecha',
      'Cliente',
      'Municipio',
      'Tipo',
      'Potencial',
      'Estado visita',
      'Cotización',
      'Resultado',
    ]);
  });

  it('writes a visit with its business date, label and plain amount (CA-05)', () => {
    const row: VisitTrackingRow = {
      visitId: 1,
      // 2026-10-27 03:00 UTC is still 2026-10-26 in Bogota.
      scheduledDate: new Date('2026-10-27T03:00:00Z'),
      clientName: 'Ferretería El Tornillo',
      municipality: 'Barranquilla',
      clientType: 'Retail',
      clientPotential: 'Alto',
      status: VisitStatus.Visited,
      quoteValue: '1500000.500000',
      result: 'Interesado',
    };

    expect(values(VISIT_TRACKING_COLUMNS, row)).toEqual([
      '2026-10-26',
      'Ferretería El Tornillo',
      'Barranquilla',
      'Retail',
      'Alto',
      'Visitado',
      '1500000.5',
      'Interesado',
    ]);
  });

  it('leaves the optional values of a pending visit empty', () => {
    const row: VisitTrackingRow = {
      visitId: 2,
      scheduledDate: new Date('2026-10-26T15:00:00Z'),
      clientName: 'Acme',
      municipality: null,
      clientType: null,
      clientPotential: null,
      status: VisitStatus.Scheduled,
      quoteValue: null,
      result: null,
    };

    expect(values(VISIT_TRACKING_COLUMNS, row)).toEqual([
      '2026-10-26',
      'Acme',
      null,
      null,
      null,
      'Pendiente',
      null,
      null,
    ]);
  });

  it('writes a quote and a sales order with Spanish headers and labels', () => {
    const quote: QuoteReportRow = {
      number: 'COT-0001',
      date: '2026-10-20',
      clientName: 'Acme',
      clientNit: '900123456-5',
      advisorName: 'Asesor Uno',
      status: 'approved',
      value: '250000.000000',
      currency: 'COP',
    };
    const order: SalesOrderReportRow = {
      number: 'PED-0001',
      date: '2026-10-21',
      clientName: 'Acme',
      clientNit: '900123456-5',
      advisorName: 'Asesor Uno',
      quoteNumber: 'COT-0001',
      status: 'delivered',
      value: '250000.000000',
      estimatedDeliveryDate: '2026-10-28',
    };

    expect(QUOTE_COLUMNS.map((c) => c.header)).toEqual([
      'Número', 'Fecha', 'Cliente', 'NIT', 'Asesor', 'Estado', 'Valor', 'Moneda',
    ]);
    expect(values(QUOTE_COLUMNS, quote)).toEqual([
      'COT-0001', '2026-10-20', 'Acme', '900123456-5', 'Asesor Uno', 'Aprobada', '250000', 'COP',
    ]);
    expect(values(SALES_ORDER_COLUMNS, order)).toEqual([
      'PED-0001', '2026-10-21', 'Acme', '900123456-5', 'Asesor Uno', 'COT-0001', 'Entregado', '250000', '2026-10-28',
    ]);
  });

  it('names the file after the report and the date (CA-06)', () => {
    expect(reportFileName('seguimiento-visitas', '2026-10-26')).toBe(
      'seguimiento-visitas-2026-10-26.csv',
    );
  });
});
