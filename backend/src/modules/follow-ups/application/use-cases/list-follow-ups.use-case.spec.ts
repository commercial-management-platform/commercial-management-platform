import type { PageRequest } from '../../../../shared/application/pagination.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import { FollowUp } from '../../domain/entities/follow-up.js';
import { ListFollowUpsUseCase } from './list-follow-ups.use-case.js';

const advisorActor = { id: 'usr_advisor_1', role: UserRole.Advisor, advisorId: 1 };
const managerActor = { id: 'usr_manager_1', role: UserRole.Director };

function aFollowUp(id: number, responsibleAdvisorId: number): FollowUp {
  return new FollowUp({
    id,
    visitId: 7,
    nextDate: '2026-10-25',
    nextTime: null,
    activity: `Actividad ${id}`,
    observation: null,
    responsibleAdvisorId,
    completed: false,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function setup(items: FollowUp[] = []) {
  const followUps = {
    findPage: vi.fn().mockResolvedValue({ items, total: items.length }),
  };
  const useCase = new ListFollowUpsUseCase(
    followUps as unknown as FollowUpRepository,
  );
  return { followUps, useCase };
}

describe('ListFollowUpsUseCase', () => {
  it('returns the page of follow-ups with total and pagination', async () => {
    const items = [aFollowUp(1, 1), aFollowUp(2, 1)];
    const { followUps, useCase } = setup(items);
    const page: PageRequest = { page: 2, limit: 10 };

    const result = await useCase.execute(
      managerActor,
      { status: 'pending', advisorId: 1 },
      page,
    );

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(followUps.findPage).toHaveBeenCalledWith(
      { status: 'pending', advisorId: 1 },
      page,
      expect.objectContaining({ role: UserRole.Director }),
    );
  });

  it('passes the advisor restriction for an advisor actor', async () => {
    const { followUps, useCase } = setup();

    await useCase.execute(advisorActor, {}, { page: 1, limit: 20 });

    expect(followUps.findPage).toHaveBeenCalledWith(
      {},
      { page: 1, limit: 20 },
      expect.objectContaining({ role: UserRole.Advisor, advisorId: 1 }),
    );
  });

  it('passes status, from and to filters through', async () => {
    const { followUps, useCase } = setup();

    await useCase.execute(
      managerActor,
      { status: 'overdue', from: '2026-01-01', to: '2026-12-31' },
      { page: 1, limit: 5 },
    );

    expect(followUps.findPage).toHaveBeenCalledWith(
      { status: 'overdue', from: '2026-01-01', to: '2026-12-31' },
      expect.anything(),
      expect.anything(),
    );
  });
});
