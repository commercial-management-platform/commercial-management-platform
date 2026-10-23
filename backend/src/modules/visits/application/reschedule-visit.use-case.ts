import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../shared/application/ports/activity-log.port.js';
import { businessDateOf } from '../../../shared/domain/time/business-time.js';
import { VisitStatus } from '../domain/visit-status.js';
import type { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import { assertNotPast } from './visit-dates.js';
import type { VisitActor } from './types/visit-actor.js';

export class RescheduleVisitUseCase {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(actor: VisitActor, id: number, scheduledDate: Date): Promise<Visit> {
    const visit = await this.visitRepository.findById(id);
    if (!visit) {
      throw new NotFoundError('Visit not found');
    }
    const previousDate = visit.scheduledDate;
    visit.reschedule(scheduledDate);
    assertNotPast(scheduledDate);

    // The status may change between the read and the write (HU-09).
    const updated = await this.visitRepository.updateIfStatus(
      visit,
      VisitStatus.Scheduled,
    );
    if (!updated) {
      throw new ValidationError('The visit is no longer scheduled');
    }
    await this.activityLog.record({
      action: 'visit.rescheduled',
      userId: actor.id,
      clientId: updated.clientId,
      description: `Visit rescheduled from ${businessDateOf(previousDate)} to ${businessDateOf(updated.scheduledDate)}`,
      occurredAt: new Date(),
    });
    return updated;
  }
}
