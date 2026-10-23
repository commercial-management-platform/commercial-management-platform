import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/index.js';
import { businessToday } from '../../../../shared/domain/time/business-time.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import { FollowUp } from '../../domain/entities/follow-up.js';
import { UpdateFollowUpUseCase } from './update-follow-up.use-case.js';

const advisorActor = { id: 'usr_advisor_1', role: UserRole.Advisor, advisorId: 1 };
const managerActor = { id: 'usr_manager_1', role: UserRole.Director };

function aFollowUp(overrides: {
  id?: number;
  responsibleAdvisorId?: number;
  completed?: boolean;
  nextDate?: string;
} = {}): FollowUp {
  return new FollowUp({
    id: overrides.id ?? 4,
    visitId: 7,
    nextDate: overrides.nextDate ?? '2026-10-25',
    nextTime: null,
    activity: 'Llamar al cliente',
    observation: null,
    responsibleAdvisorId: overrides.responsibleAdvisorId ?? 1,
    completed: overrides.completed ?? false,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function setup(fu: FollowUp = aFollowUp()) {
  const followUps = {
    findById: vi.fn().mockResolvedValue(fu),
    update: vi.fn().mockResolvedValue(fu),
  };
  const useCase = new UpdateFollowUpUseCase(
    followUps as unknown as FollowUpRepository,
  );
  return { followUps, useCase };
}

describe('UpdateFollowUpUseCase', () => {
  it('updates a pending follow-up (date, activity, observation)', async () => {
    const { followUps, useCase } = setup();
    const today = businessToday();

    const result = await useCase.execute(
      advisorActor,
      4,
      { nextDate: today, activity: 'Enviar cotización', observation: 'Pendiente de firma' },
    );

    expect(result.activity).toBe('Enviar cotización');
    expect(result.observation).toBe('Pendiente de firma');
    expect(followUps.update).toHaveBeenCalled();
  });

  it('rejects updating a completed follow-up', async () => {
    const { followUps, useCase } = setup(aFollowUp({ completed: true }));

    await expect(
      useCase.execute(advisorActor, 4, { activity: 'X' }),
    ).rejects.toThrow(ValidationError);
    expect(followUps.update).not.toHaveBeenCalled();
  });

  it('rejects moving the date to the past', async () => {
    const { followUps, useCase } = setup();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    await expect(
      useCase.execute(advisorActor, 4, { nextDate: yesterday }),
    ).rejects.toThrow(ValidationError);
    expect(followUps.update).not.toHaveBeenCalled();
  });

  it('rejects an advisor that is not the responsible', async () => {
    const { useCase } = setup(aFollowUp({ responsibleAdvisorId: 2 }));
    const actor = { ...advisorActor, advisorId: 9 };

    await expect(
      useCase.execute(actor, 4, { activity: 'X' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('lets a manager update any follow-up', async () => {
    const { followUps, useCase } = setup(aFollowUp({ responsibleAdvisorId: 2 }));

    const result = await useCase.execute(managerActor, 4, { activity: 'X' });
    expect(result).toBeDefined();
    expect(followUps.update).toHaveBeenCalled();
  });

  it('keeps fields unchanged when not provided', async () => {
    const { followUps, useCase } = setup();
    await useCase.execute(advisorActor, 4, { activity: 'Solo actividad' });
    const saved = followUps.update.mock.calls[0][0];
    expect(saved.nextDate).toBe('2026-10-25');
    expect(saved.activity).toBe('Solo actividad');
  });
});
