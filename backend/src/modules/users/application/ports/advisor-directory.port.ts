import type { AdvisorStatus } from './advisor-profile.port.js';

export const ADVISOR_DIRECTORY_PORT = Symbol('ADVISOR_DIRECTORY_PORT');

/** Row of the `advisor` table. Its `id` is the one routes, visits, quotes and orders reference. */
export interface Advisor {
  id: number;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  status: AdvisorStatus;
}

/** Read access to the `advisor` table, for the screens that assign work to an advisor. */
export interface AdvisorDirectoryPort {
  /** Sorted by name. Only active advisors unless `includeInactive` is true. */
  findAll(options: { includeInactive: boolean }): Promise<Advisor[]>;
}
