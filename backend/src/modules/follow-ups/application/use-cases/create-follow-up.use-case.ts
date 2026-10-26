import { ValidationError, NotFoundError } from '../../../../shared/domain/errors/index.js';
import { FollowUp } from '../../domain/entities/follow-up.js';
import type { FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import type { VisitRepository } from '../../../visits/domain/visit.repository.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';
import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { businessToday } from '../../../../shared/domain/time/business-time.js';

export class CreateFollowUpUseCase {
  constructor(
    private readonly followUps: FollowUpRepository,
    private readonly visits: VisitRepository,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(
    actor: { id: string; role: UserRole },
    visitId: number,
    input: {
      nextDate: string;
      nextTime?: string | null;
      activity: string;
      observation?: string | null;
      responsibleAdvisorId?: number;
    },
  ): Promise<FollowUp> {
    const visit = await this.visits.findById(visitId);
    if (!visit) throw new NotFoundError('Visit not found');

    if (actor.role === UserRole.Advisor) {
      const assigned = await this.visits.isAssignedToAdvisorUser(visitId, actor.id);
      if (!assigned) throw new NotFoundError('Visit not found');
    }

    // HU-10 CA-01: only a recorded visit gets follow-ups.
    if (visit.status !== VisitStatus.Visited) {
      throw new ValidationError(
        `Only a visited visit can have follow-ups; this visit is ${visit.status}`,
      );
    }

    FollowUp.assertSchedulable(input, businessToday());

    const responsibleAdvisorId = input.responsibleAdvisorId ?? visit.advisorId;

    const followUp = FollowUp.create({
      visitId: visit.id!,
      nextDate: input.nextDate,
      nextTime: input.nextTime ?? null,
      activity: input.activity,
      observation: input.observation ?? null,
      responsibleAdvisorId,
    });

    const saved = await this.followUps.save(followUp);

    await this.activityLog.record({
      action: 'follow_up.created',
      userId: actor.id,
      clientId: visit.clientId,
      description: `Follow-up created for visit ${visit.id} (next ${input.nextDate}${input.nextTime ? ' ' + input.nextTime : ''})`,
      occurredAt: new Date(),
    });

    return saved;
  }
}
