import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../shared/application/ports/activity-log.port.js';
import { businessDateOf } from '../../../shared/domain/time/business-time.js';
import { VisitStatus } from '../domain/visit-status.js';
import type { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitActor } from './types/visit-actor.js';

export class CancelVisitUseCase {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(actor: VisitActor, id: number): Promise<Visit> {
    const visit = await this.visitRepository.findById(id);
    if (!visit) {
      throw new NotFoundError('Visit not found');
    }
    visit.cancel();

    // The status may change between the read and the write (HU-09).
    const updated = await this.visitRepository.updateIfStatus(
      visit,
      VisitStatus.Scheduled,
    );
    if (!updated) {
      throw new ValidationError('The visit is no longer scheduled');
    }
    await this.activityLog.record({
      action: 'visit.cancelled',
      userId: actor.id,
      clientId: updated.clientId,
      description: `Visit scheduled for ${businessDateOf(updated.scheduledDate)} cancelled`,
      occurredAt: new Date(),
    });
    return updated;
  }
}
