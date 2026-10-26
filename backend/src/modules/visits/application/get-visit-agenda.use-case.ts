import {
  businessDayRange,
  businessToday,
  businessWeekRange,
} from '../../../shared/domain/time/business-time.js';
import type { VisitAgendaEntry } from '../domain/visit-agenda-entry.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitActor } from './types/visit-actor.js';
import { inBusinessTime } from './visit-dates.js';

export type AgendaPeriod = 'day' | 'week';

export class GetVisitAgendaUseCase {
  constructor(private readonly visitRepository: VisitRepository) {}

  /**
   * Visits of the session advisor for one day or one week (Monday to Sunday).
   * By default, today in business time.
   */
  async execute(
    actor: VisitActor,
    input: { period?: AgendaPeriod; date?: string },
  ): Promise<VisitAgendaEntry[]> {
    const date = input.date ?? businessToday();
    const range = inBusinessTime(() =>
      input.period === 'week' ? businessWeekRange(date) : businessDayRange(date),
    );
    return this.visitRepository.findAgenda(actor.id, range);
  }
}
