import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/index.js';
import type { FollowUp } from '../../domain/entities/follow-up.js';
import type { FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import type { VisitRepository } from '../../../visits/domain/visit.repository.js';
import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

export class CompleteFollowUpUseCase {
  constructor(
    private readonly followUps: FollowUpRepository,
    private readonly visits: VisitRepository,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(actor: { id: string; role: UserRole; advisorId?: number }, id: number): Promise<FollowUp> {
    const fu = await this.followUps.findById(id);
    if (!fu) throw new NotFoundError('Follow-up not found');
    if (actor.role === UserRole.Advisor && actor.advisorId !== undefined) {
      if (fu.responsibleAdvisorId !== actor.advisorId) throw new NotFoundError('Follow-up not found');
    }
    if (fu.completed) {
      // prevent altering original date; be idempotent but don't change completed_at
      return fu;
    }
    const now = new Date();
    fu.completed = true;
    fu.completedAt = now;
    const saved = await this.followUps.update(fu);
    const visit = await this.visits.findById(fu.visitId);
    if (visit) {
      await this.activityLog.record({
        action: 'follow_up.completed',
        userId: actor.id,
        clientId: visit.clientId,
        description: `Follow-up ${fu.id} completed for visit ${fu.visitId}`,
        occurredAt: now,
      });
    }
    return saved;
  }
}
