import type { VisitStatus } from '../../../visits/domain/visit-status.js';

/**
 * One row of the table "Seguimiento de rutas y visitas" (HU-15, CA-06). The
 * CSV report of the same table (HU-17) uses this read model too. Plain data:
 * the dashboard only reads. Amounts are decimal text, as PostgreSQL returns
 * numeric, to keep their exact value.
 */
export interface VisitTrackingRow {
  visitId: number;
  scheduledDate: Date;
  advisorId: number;
  advisorName: string;
  /** Zone (territory) of the client. */
  zone: string | null;
  routeId: number | null;
  routeName: string | null;
  clientId: number;
  /** Trade name if the client has one, otherwise the legal name. */
  clientName: string;
  municipality: string | null;
  clientType: string | null;
  clientPotential: string | null;
  status: VisitStatus;
  /** Visit result catalog name (HU-09); null until the outcome is recorded. */
  result: string | null;
  /** Numbers of the quotes linked to the visit, e.g. "COT-0001 / COT-0004". */
  quoteNumbers: string | null;
  /** Sum of the quotes linked to the visit; null if it has none. */
  quoteValue: string | null;
  /** Sales orders of the visit or of its quotes. */
  orderNumbers: string | null;
  /** Earliest pending follow-up of the visit, YYYY-MM-DD. */
  nextFollowUp: string | null;
}
