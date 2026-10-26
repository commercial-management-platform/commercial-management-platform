import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/index.js';
import { businessToday } from '../../../../shared/domain/time/business-time.js';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { ActivityLogPort } from '../../../../shared/application/ports/activity-log.port.js';
import { FollowUp } from '../../domain/entities/follow-up.js';
import type { FollowUpRepository } from '../../domain/ports/follow-up.repository.js';
import type { VisitRepository } from '../../../visits/domain/visit.repository.js';
import { VisitStatus } from '../../../visits/domain/visit-status.js';
import { CreateFollowUpUseCase } from './create-follow-up.use-case.js';

const advisorActor = { id: 'usr_advisor_1', role: UserRole.Advisor };
const managerActor = { id: 'usr_manager_1', role: UserRole.Director };
/** Always in the future, so the tests do not expire. */
const nextWeek = businessToday(new Date(Date.now() + 7 * 86_400_000));

function aVisit(
  overrides: { id?: number; clientId?: number; advisorId?: number; status?: VisitStatus } = {},
): any {
  return {
    id: overrides.id ?? 7,
    clientId: overrides.clientId ?? 11,
    advisorId: overrides.advisorId ?? 1,
    status: overrides.status ?? VisitStatus.Visited,
  };
}

function setup(overrides: {
  visit?: any;
  assigned?: boolean;
  activityLog?: ActivityLogPort;
} = {}) {
  const v = overrides.visit ?? aVisit();
  const followUps = {
    save: vi.fn().mockImplementation((fu: FollowUp) => Promise.resolve(fu)),
  };
  const visits = {
    findById: vi.fn().mockResolvedValue(v),
    isAssignedToAdvisorUser: vi.fn().mockResolvedValue(overrides.assigned ?? true),
  };
  const activityLog = overrides.activityLog ?? { record: vi.fn().mockResolvedValue(undefined) };
  const useCase = new CreateFollowUpUseCase(
    followUps as unknown as FollowUpRepository,
    visits as unknown as VisitRepository,
    activityLog,
  );
  return { followUps, visits, activityLog, useCase };
}

describe('CreateFollowUpUseCase', () => {
  it('creates a follow-up linked to a completed visit', async () => {
    const { followUps, activityLog, useCase } = setup();

    const result = await useCase.execute(advisorActor, 7, {
      nextDate: nextWeek,
      activity: 'Enviar cotización',
    });

    expect(result.visitId).toBe(7);
    expect(result.activity).toBe('Enviar cotización');
    expect(result.completed).toBe(false);
    expect(followUps.save).toHaveBeenCalled();
    expect(activityLog.record).toHaveBeenCalledWith({
      action: 'follow_up.created',
      userId: 'usr_advisor_1',
      clientId: 11,
      description: expect.stringContaining('visit 7'),
      occurredAt: expect.any(Date),
    });
  });

  it('defaults the responsible advisor to the visit advisor', async () => {
    const { followUps, useCase } = setup({ visit: aVisit({ advisorId: 5 }) });

    await useCase.execute(managerActor, 7, {
      nextDate: nextWeek,
      activity: 'Visita de seguimiento',
    });

    const saved = followUps.save.mock.calls[0][0];
    expect(saved.responsibleAdvisorId).toBe(5);
  });

  it('rejects a visit that does not exist', async () => {
    const { visits, useCase } = setup();
    visits.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(advisorActor, 999, { nextDate: nextWeek, activity: 'X' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects a past nextDate', async () => {
    const { useCase } = setup();
    const yyyymmdd = businessToday(new Date(Date.now() - 86_400_000));

    await expect(
      useCase.execute(advisorActor, 7, { nextDate: yyyymmdd, activity: 'X' }),
    ).rejects.toThrow(ValidationError);
  });

  it.each([VisitStatus.Scheduled, VisitStatus.Cancelled])(
    'rejects a %s visit (only recorded visits get follow-ups)',
    async (status) => {
      const { followUps, useCase } = setup({ visit: aVisit({ status }) });

      await expect(
        useCase.execute(advisorActor, 7, { nextDate: nextWeek, activity: 'X' }),
      ).rejects.toThrow(ValidationError);
      expect(followUps.save).not.toHaveBeenCalled();
    },
  );

  it('rejects a blank activity', async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute(advisorActor, 7, { nextDate: nextWeek, activity: '   ' }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects an advisor that is not assigned to the visit', async () => {
    const { useCase } = setup({ assigned: false });

    await expect(
      useCase.execute(advisorActor, 7, { nextDate: nextWeek, activity: 'X' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('allows an advisor to create a follow-up for their own visit', async () => {
    const { useCase } = setup({ visit: aVisit({ advisorId: 1 }), assigned: true });

    await expect(
      useCase.execute(advisorActor, 7, { nextDate: nextWeek, activity: 'X' }),
    ).resolves.toBeDefined();
  });
});
