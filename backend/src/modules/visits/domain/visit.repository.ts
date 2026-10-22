import type { PageRequest } from '../../../shared/application/pagination.js';
import type { InstantRange } from '../../../shared/domain/time/business-time.js';
import type { VisitAgendaEntry } from './visit-agenda-entry.js';
import type { VisitStatus } from './visit-status.js';
import type { Visit } from './visit.js';

export const VISIT_REPOSITORY = Symbol('VISIT_REPOSITORY');

export interface VisitFilterOptions {
  /** Only visits scheduled within this range. */
  scheduledWithin?: InstantRange;
  advisorId?: number;
  /** When set, only visits whose advisor has this betterAuth user id. */
  advisorUserId?: string;
  /** Zone of the client. */
  zoneId?: number;
  status?: VisitStatus;
}

export interface VisitRepository {
  findById(id: number): Promise<Visit | null>;
  /** True when the visit's advisor is linked to the given betterAuth user. */
  isAssignedToAdvisorUser(visitId: number, userId: string): Promise<boolean>;
  /** Ordered by scheduled date and then visit order. */
  findPage(
    filter: VisitFilterOptions,
    page: PageRequest,
  ): Promise<{ items: Visit[]; total: number }>;
  /** Visits of the advisor linked to `userId`, ordered by time and visit order. */
  findAgenda(userId: string, range: InstantRange): Promise<VisitAgendaEntry[]>;
  /** The ids, among `clientIds`, of the clients with a scheduled visit in `range`. */
  findClientIdsWithScheduledVisit(
    clientIds: number[],
    range: InstantRange,
  ): Promise<number[]>;
  save(visit: Visit): Promise<Visit>;
  /** Saves every visit in one transaction: all or none. */
  saveAll(visits: Visit[]): Promise<Visit[]>;
  /**
   * Saves the schedule and status of an existing visit only if its stored
   * status is still `expected`. Returns null when it changed meanwhile.
   */
  updateIfStatus(visit: Visit, expected: VisitStatus): Promise<Visit | null>;
}
