import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/domain/errors/index.js';
import type { FollowUp } from '../../domain/entities/follow-up.js';
import type { FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { businessToday } from '../../../../shared/domain/time/business-time.js';

export class UpdateFollowUpUseCase {
  constructor(private readonly followUps: FollowUpRepository) {}

  async execute(actor: { id: string; role: UserRole; advisorId?: number }, id: number, input: { nextDate?: string; activity?: string; observation?: string | null }): Promise<FollowUp> {
    const fu = await this.followUps.findById(id);
    if (!fu) throw new NotFoundError('Follow-up not found');
    if (actor.role === UserRole.Advisor && actor.advisorId !== undefined) {
      if (fu.responsibleAdvisorId !== actor.advisorId) throw new NotFoundError('Follow-up not found');
    }
    if (fu.completed) {
      throw new ValidationError('Cannot update a completed follow-up');
    }
    if (input.nextDate) {
      const today = businessToday();
      if (input.nextDate < today) throw new ValidationError('nextDate cannot be in the past');
    }
    if (input.nextDate !== undefined) fu.nextDate = input.nextDate;
    if (input.activity !== undefined) fu.activity = input.activity;
    if (input.observation !== undefined) fu.observation = input.observation;
    const saved = await this.followUps.update(fu);
    return saved;
  }
}
