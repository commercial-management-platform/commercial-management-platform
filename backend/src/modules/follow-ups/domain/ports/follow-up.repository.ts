import type { PageRequest } from '../../../../shared/application/pagination.js';

export const FOLLOW_UP_REPOSITORY = Symbol('FOLLOW_UP_REPOSITORY');

export interface FollowUpFilterOptions {
  status?: 'pending' | 'overdue' | 'completed';
  advisorId?: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface FollowUpWithVisit {
  followUp: import('../entities/follow-up.js').FollowUp;
  visitId: number;
  clientId?: number;
}

export interface FollowUpRepository {
  findById(id: number): Promise<import('../entities/follow-up.js').FollowUp | null>;
  findByIdWithContext?(id: number): Promise<(import('../entities/follow-up.js').FollowUp & { visitClientId?: number }) | null>;
  findPage(
    filter: FollowUpFilterOptions,
    page: PageRequest,
    actor: { role: string; advisorId?: number; userId?: string },
  ): Promise<{ items: import('../entities/follow-up.js').FollowUp[]; total: number }>;
  save(followUp: import('../entities/follow-up.js').FollowUp): Promise<import('../entities/follow-up.js').FollowUp>;
  update(followUp: import('../entities/follow-up.js').FollowUp): Promise<import('../entities/follow-up.js').FollowUp>;
}
