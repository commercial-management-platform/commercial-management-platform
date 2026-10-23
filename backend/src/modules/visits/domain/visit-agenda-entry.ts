import type { VisitStatus } from './visit-status.js';

/**
 * Read model of one visit in the agenda of an advisor: the visit plus what
 * the advisor needs on the road (client, primary contact and potential).
 */
export interface VisitAgendaEntry {
  id: number;
  routeId: number | null;
  scheduledDate: Date;
  visitOrder: number | null;
  actualDate: Date | null;
  status: VisitStatus;
  client: {
    id: number;
    businessName: string;
    address: string | null;
  };
  /** Active primary contact of the client; null when it has none. */
  primaryContact: {
    name: string;
    phone: string | null;
    mobile: string | null;
    email: string | null;
  } | null;
  /** client_potential catalog entry of the client; null when it has none. */
  potential: { id: number; name: string } | null;
}
