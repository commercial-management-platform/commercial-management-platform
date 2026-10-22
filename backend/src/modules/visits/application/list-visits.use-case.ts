import type {
  PageRequest,
  Paginated,
} from '../../../shared/application/pagination.js';
import { ValidationError } from '../../../shared/domain/errors/index.js';
import {
  businessDayRange,
  businessWeekRange,
} from '../../../shared/domain/time/business-time.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import type { VisitStatus } from '../domain/visit-status.js';
import type { Visit } from '../domain/visit.js';
import type {
  VisitFilterOptions,
  VisitRepository,
} from '../domain/visit.repository.js';
import type { VisitActor } from './types/visit-actor.js';
import { inBusinessTime } from './visit-dates.js';

export interface ListVisitsFilters {
  /** One day, YYYY-MM-DD in business time. */
  date?: string;
  /** Any day of the week, YYYY-MM-DD; Monday to Sunday is listed. */
  week?: string;
  advisorId?: number;
  zoneId?: number;
  status?: VisitStatus;
}

export class ListVisitsUseCase {
  constructor(private readonly visitRepository: VisitRepository) {}

  /** An advisor only lists their own visits, whatever advisorId they send. */
  async execute(
    actor: VisitActor,
    filters: ListVisitsFilters,
    page: PageRequest,
  ): Promise<Paginated<Visit>> {
    if (filters.date !== undefined && filters.week !== undefined) {
      throw new ValidationError('Send either date or week, not both');
    }
    const { date, week } = filters;
    const scheduledWithin = inBusinessTime(() =>
      date !== undefined
        ? businessDayRange(date)
        : week !== undefined
          ? businessWeekRange(week)
          : undefined,
    );

    const filter: VisitFilterOptions = {
      scheduledWithin,
      zoneId: filters.zoneId,
      status: filters.status,
      ...(actor.role === UserRole.Advisor
        ? { advisorUserId: actor.id }
        : { advisorId: filters.advisorId }),
    };
    const { items, total } = await this.visitRepository.findPage(filter, page);
    return { data: items, total, page: page.page, limit: page.limit };
  }
}
