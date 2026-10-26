import { scheduledWithin } from '../../../../shared/application/business-date-filters.js';
import type {
  PageRequest,
  Paginated,
} from '../../../../shared/application/pagination.js';
import { businessToday } from '../../../../shared/domain/time/business-time.js';
import type { VisitStatus } from '../../../visits/domain/visit-status.js';
import type { VisitTrackingRow } from '../../domain/entities/visit-tracking-row.js';
import type { DashboardReadPort } from '../../domain/ports/dashboard-read.port.js';
import { advisorScope, type DashboardActor } from '../dashboard-actor.js';

export interface ListVisitTrackingInput {
  /** Any day of the week, YYYY-MM-DD. Cannot be combined with fromDate/toDate. */
  week?: string;
  /** Inclusive range of days, YYYY-MM-DD. */
  fromDate?: string;
  toDate?: string;
  zoneId?: number;
  advisorId?: number;
  status?: VisitStatus;
  /** Text in the client, municipality, advisor or route (case and accents as typed). */
  search?: string;
}

/**
 * Table "Seguimiento de rutas y visitas" of the dashboard (HU-15, CA-06),
 * newest visit first. Without dates it shows the current week (CA-02).
 */
export class ListVisitTrackingUseCase {
  constructor(private readonly reader: DashboardReadPort) {}

  async execute(
    actor: DashboardActor,
    input: ListVisitTrackingInput,
    page: PageRequest,
    now: Date = new Date(),
  ): Promise<Paginated<VisitTrackingRow>> {
    const noDates =
      input.week === undefined &&
      input.fromDate === undefined &&
      input.toDate === undefined;
    const range = scheduledWithin(
      noDates ? { week: businessToday(now) } : input,
    );
    return this.reader.trackingPage(
      {
        from: range.start,
        to: range.end,
        zoneId: input.zoneId,
        status: input.status,
        search: input.search,
        ...advisorScope(actor, input.advisorId),
      },
      page,
    );
  }
}
