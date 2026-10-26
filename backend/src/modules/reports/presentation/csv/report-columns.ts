import {
  formatCsvDecimal,
  type CsvColumn,
} from '../../../../shared/infrastructure/csv/csv-writer.js';
import {
  businessDateOf,
  businessTimeOf,
  isoWeekNumber,
  weekdayOf,
} from '../../../../shared/domain/time/business-time.js';
import type { QuoteStatus } from '../../../quotes/domain/entities/quote-status.js';
import type { SalesOrderStatus } from '../../../sales-orders/domain/entities/sales-order-status.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';
import type {
  QuoteReportRow,
  SalesOrderReportRow,
  VisitTrackingRow,
} from '../../domain/entities/report-rows.js';

/**
 * Columns of each CSV report: Spanish headers (CA-04), dates as YYYY-MM-DD
 * and amounts as plain numbers without currency symbol (CA-05). The labels
 * match the ones the frontend shows.
 */

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  [VisitStatus.Scheduled]: 'Programada',
  [VisitStatus.Visited]: 'Visitada',
  [VisitStatus.Cancelled]: 'Cancelada',
};

const WEEKDAY_LABELS: Record<ReturnType<typeof weekdayOf>, string> = {
  Monday: 'lunes',
  Tuesday: 'martes',
  Wednesday: 'miércoles',
  Thursday: 'jueves',
  Friday: 'viernes',
  Saturday: 'sábado',
  Sunday: 'domingo',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

/** Calendar date of the visit in business time (America/Bogota). */
const visitDate = (row: VisitTrackingRow) => businessDateOf(row.scheduledDate);

/** Same columns as the dashboard table "Seguimiento de rutas y visitas" (CA-01, HU-15 CA-06). */
export const VISIT_TRACKING_COLUMNS: readonly CsvColumn<VisitTrackingRow>[] = [
  { header: 'Fecha', value: visitDate },
  { header: 'Hora', value: (row) => businessTimeOf(row.scheduledDate) },
  { header: 'Asesor', value: (row) => row.advisorName },
  { header: 'Territorio', value: (row) => row.zone },
  { header: 'Semana', value: (row) => isoWeekNumber(visitDate(row)) },
  { header: 'Día', value: (row) => WEEKDAY_LABELS[weekdayOf(visitDate(row))] },
  { header: 'Ruta', value: (row) => row.routeName },
  { header: 'Cliente', value: (row) => row.clientName },
  { header: 'Municipio', value: (row) => row.municipality },
  { header: 'Tipo de cliente', value: (row) => row.clientType },
  { header: 'Potencial', value: (row) => row.clientPotential },
  { header: 'Estado de la visita', value: (row) => VISIT_STATUS_LABELS[row.status] },
  { header: 'Resultado', value: (row) => row.result },
  { header: 'Cotización', value: (row) => row.quoteNumbers },
  { header: 'Valor cotización', value: (row) => formatCsvDecimal(row.quoteValue) },
  { header: 'Pedido', value: (row) => row.orderNumbers },
  { header: 'Próximo seguimiento', value: (row) => row.nextFollowUp },
];

export const QUOTE_COLUMNS: readonly CsvColumn<QuoteReportRow>[] = [
  { header: 'Número', value: (row) => row.number },
  { header: 'Fecha', value: (row) => row.date },
  { header: 'Cliente', value: (row) => row.clientName },
  { header: 'NIT', value: (row) => row.clientNit },
  { header: 'Asesor', value: (row) => row.advisorName },
  { header: 'Estado', value: (row) => QUOTE_STATUS_LABELS[row.status] },
  { header: 'Valor', value: (row) => formatCsvDecimal(row.value) },
  { header: 'Moneda', value: (row) => row.currency },
];

export const SALES_ORDER_COLUMNS: readonly CsvColumn<SalesOrderReportRow>[] = [
  { header: 'Número', value: (row) => row.number },
  { header: 'Fecha', value: (row) => row.date },
  { header: 'Cliente', value: (row) => row.clientName },
  { header: 'NIT', value: (row) => row.clientNit },
  { header: 'Asesor', value: (row) => row.advisorName },
  { header: 'Cotización', value: (row) => row.quoteNumber },
  { header: 'Estado', value: (row) => SALES_ORDER_STATUS_LABELS[row.status] },
  { header: 'Valor', value: (row) => formatCsvDecimal(row.value) },
  { header: 'Entrega estimada', value: (row) => row.estimatedDeliveryDate },
];
