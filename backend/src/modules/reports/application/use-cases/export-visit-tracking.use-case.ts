import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { VisitStatus } from '../../../visits/domain/visit-status.js';
import type { VisitTrackingRow } from '../../domain/entities/report-rows.js';
import type { ReportSourcesPort } from '../../domain/ports/report-sources.port.js';
import { scheduledWithin } from '../report-dates.js';
import type { ReportActor } from '../types/report-actor.js';

/** Same filters as the dashboard tracking table (CA-02). */
export interface ExportVisitTrackingInput {
  /** Any day of the week, YYYY-MM-DD; Monday to Sunday is exported. */
  week?: string;
  /** Inclusive range of days, YYYY-MM-DD. Cannot be combined with week. */
  fromDate?: string;
  toDate?: string;
  zoneId?: number;
  advisorId?: number;
  status?: VisitStatus;
}

/**
 * "Seguimiento de rutas y visitas" report (HU-17, CA-01). An advisor only
 * exports their own visits, whatever advisorId they send; admin and director
 * export every visit (CA-03), the same rule as GET /visits.
 */
export class ExportVisitTrackingUseCase {
  constructor(private readonly sources: ReportSourcesPort) {}

  /** Validates before returning: the rows are only read when iterated. */
  async execute(
    actor: ReportActor,
    input: ExportVisitTrackingInput,
  ): Promise<AsyncIterable<VisitTrackingRow>> {
    const range = scheduledWithin(input);

    return this.sources.visitTracking({
      from: range.start,
      to: range.end,
      zoneId: input.zoneId,
      status: input.status,
      ...(actor.role === UserRole.Advisor
        ? { advisorUserId: actor.id }
        : { advisorId: input.advisorId }),
    });
  }
}
