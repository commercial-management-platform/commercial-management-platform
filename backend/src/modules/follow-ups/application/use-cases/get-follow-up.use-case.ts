import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { FollowUp } from '../../domain/entities/follow-up.js';
import type { FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

export class GetFollowUpUseCase {
  constructor(private readonly followUps: FollowUpRepository) {}

  async execute(actor: { id: string; role: UserRole; advisorId?: number }, id: number): Promise<FollowUp> {
    const fu = await this.followUps.findById(id);
    if (!fu) throw new NotFoundError('Follow-up not found');
    if (actor.role === UserRole.Advisor && actor.advisorId !== undefined) {
      if (fu.responsibleAdvisorId !== actor.advisorId) throw new NotFoundError('Follow-up not found');
    }
    return fu;
  }
}
