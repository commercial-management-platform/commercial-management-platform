import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import type { FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import type { VisitRepository } from '../../../visits/domain/visit.repository.js';
import { FollowUp } from '../../domain/entities/follow-up.js';
import { CompleteFollowUpUseCase } from './complete-follow-up.use-case.js';

const advisorActor = { id: 'usr_advisor_1', role: UserRole.Advisor, advisorId: 1 };
const managerActor = { id: 'usr_manager_1', role: UserRole.Director };

function aFollowUp(overrides: {
  id?: number;
  responsibleAdvisorId?: number;
  completed?: boolean;
  completedAt?: Date | null;
  visitId?: number;
} = {}): FollowUp {
  return new FollowUp({
    id: overrides.id ?? 4,
    visitId: overrides.visitId ?? 7,
    nextDate: '2026-10-25',
    nextTime: null,
    activity: 'Llamar al cliente',
    observation: null,
    responsibleAdvisorId: overrides.responsibleAdvisorId ?? 1,
    completed: overrides.completed ?? false,
    completedAt: overrides.completedAt ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function setup(fu: FollowUp = aFollowUp()) {
  const followUps = {
    findById: vi.fn().mockResolvedValue(fu),
    update: vi.fn().mockResolvedValue(fu),
  };
  const visits = {
    findById: vi.fn().mockResolvedValue({ id: fu.visitId, clientId: 11 }),
  };
  const activityLog = { record: vi.fn().mockResolvedValue(undefined) };
  const useCase = new CompleteFollowUpUseCase(
    followUps as unknown as FollowUpRepository,
    visits as unknown as VisitRepository,
    activityLog,
  );
  return { followUps, visits, activityLog, useCase };
}

describe('CompleteFollowUpUseCase', () => {
  it('completes a pending follow-up and records follow_up.completed', async () => {
    const { followUps, activityLog, useCase } = setup();

    const result = await useCase.execute(advisorActor, 4);

    expect(result.completed).toBe(true);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(followUps.update).toHaveBeenCalled();
    expect(activityLog.record).toHaveBeenCalledWith({
      action: 'follow_up.completed',
      userId: 'usr_advisor_1',
      clientId: 11,
      description: expect.stringContaining('visit 7'),
      occurredAt: expect.any(Date),
    });
  });

  it('is idempotent when already completed (does not change completed_at)', async () => {
    const completedAt = new Date('2026-10-20T10:00:00Z');
    const { followUps, activityLog, useCase } = setup(
      aFollowUp({ completed: true, completedAt }),
    );

    const result = await useCase.execute(advisorActor, 4);

    expect(result.completedAt).toBe(completedAt);
    expect(followUps.update).not.toHaveBeenCalled();
    expect(activityLog.record).not.toHaveBeenCalled();
  });

  it('rejects a follow-up that does not exist', async () => {
    const { followUps, useCase } = setup();
    followUps.findById.mockResolvedValue(null);

    await expect(useCase.execute(advisorActor, 999)).rejects.toThrow(
      NotFoundError,
    );
  });

  it('rejects an advisor that is not the responsible', async () => {
    const { useCase } = setup(aFollowUp({ responsibleAdvisorId: 2 }));
    const actor = { ...advisorActor, advisorId: 9 };

    await expect(useCase.execute(actor, 4)).rejects.toThrow(NotFoundError);
  });

  it('lets a manager complete any follow-up', async () => {
    const { followUps, useCase } = setup(aFollowUp({ responsibleAdvisorId: 2 }));

    const result = await useCase.execute(managerActor, 4);
    expect(result.completed).toBe(true);
    expect(followUps.update).toHaveBeenCalled();
  });
});
