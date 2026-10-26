import { scheduledWithin } from '../../../../shared/application/business-date-filters.js';
import {
  businessDateOf,
  businessToday,
  isoWeekNumber,
} from '../../../../shared/domain/time/business-time.js';
import type { CommercialKpis } from '../../domain/entities/commercial-kpis.js';
import type {
  DashboardReadPort,
  KpiFilter,
} from '../../domain/ports/dashboard-read.port.js';
import { advisorScope, type DashboardActor } from '../dashboard-actor.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface GetDashboardKpisInput {
  /** Any day of the week, YYYY-MM-DD. Defaults to the current week (CA-02). */
  week?: string;
  zoneId?: number;
  advisorId?: number;
}

export interface DashboardKpis {
  /** Monday and Sunday of the week, YYYY-MM-DD, and its ISO number. */
  week: { from: string; to: string; isoWeek: number };
  current: CommercialKpis;
  /** Same indicators of the week before, to show the trend. */
  previous: CommercialKpis;
}

/**
 * Indicators of the dashboard (HU-15) for a week, in business time
 * (America/Bogota), and the same ones for the week before.
 */
export class GetDashboardKpisUseCase {
  constructor(private readonly reader: DashboardReadPort) {}

  async execute(
    actor: DashboardActor,
    input: GetDashboardKpisInput,
    now: Date = new Date(),
  ): Promise<DashboardKpis> {
    const { start, end } = scheduledWithin({
      week: input.week ?? businessToday(now),
    }) as { start: Date; end: Date };
    const scope = { zoneId: input.zoneId, ...advisorScope(actor, input.advisorId) };

    const filterOf = (from: Date, to: Date): KpiFilter => ({
      ...scope,
      from,
      to,
      fromDate: businessDateOf(from),
      // `to` is the next Monday 00:00: the last day is the Sunday before it.
      toDate: businessDateOf(new Date(to.getTime() - DAY_MS)),
    });
    const thisWeek = filterOf(start, end);
    const lastWeek = filterOf(
      new Date(start.getTime() - 7 * DAY_MS),
      start,
    );

    const [current, previous] = await Promise.all([
      this.reader.kpis(thisWeek),
      this.reader.kpis(lastWeek),
    ]);
    return {
      week: {
        from: thisWeek.fromDate,
        to: thisWeek.toDate,
        isoWeek: isoWeekNumber(thisWeek.fromDate),
      },
      current,
      previous,
    };
  }
}
