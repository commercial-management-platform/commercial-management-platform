import type { PageRequest, Paginated } from '../../../../shared/application/pagination.js';
import type { FollowUp } from '../../domain/entities/follow-up.js';
import type { FollowUpFilterOptions, FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';

export class ListFollowUpsUseCase {
  constructor(private readonly followUps: FollowUpRepository) {}

  async execute(
    actor: { id: string; role: UserRole; advisorId?: number },
    filters: FollowUpFilterOptions,
    page: PageRequest,
  ): Promise<Paginated<FollowUp>> {
    const { items, total } = await this.followUps.findPage(filters, page, actor as any);
    return { data: items, total, page: page.page, limit: page.limit };
  }
}
