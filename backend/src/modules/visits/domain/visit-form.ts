import type { VisitStatus } from './visit-status.js';

/**
 * Read model for the advisor's visit form (HU-09, CA-04): everything the
 * advisor needs before starting the visit, pre-filled by the backend.
 */
export interface VisitForm {
  visit: {
    id: number;
    scheduledDate: Date;
    status: VisitStatus;
    visitOrder: number | null;
    startedAt: Date | null;
    locationConfirmed: boolean;
  };
  client: {
    id: number;
    businessName: string;
    tradeName: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  /** Active primary contact of the client; null when it has none. */
  primaryContact: {
    name: string;
    phone: string | null;
    mobile: string | null;
    email: string | null;
  } | null;
  route: { id: number; name: string } | null;
  zone: { id: number; name: string } | null;
  advisor: { id: number; name: string };
  /** The scheduled date's week and day, in business time. */
  week: {
    date: string;
    isoWeek: number;
    weekday: string;
  };
}
