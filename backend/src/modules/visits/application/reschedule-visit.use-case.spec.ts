import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import { VisitStatus } from '../domain/visit-status.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import { RescheduleVisitUseCase } from './reschedule-visit.use-case.js';

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

function scheduledVisit(status: VisitStatus = VisitStatus.Scheduled): Visit {
  return new Visit({
    id: 1,
    clientId: 10,
    advisorId: 2,
    routeId: null,
    scheduledDate: new Date(),
    visitOrder: null,
    actualDate: null,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function setup(visit: Visit = scheduledVisit()) {
  const visitRepository = {
    findById: vi.fn().mockResolvedValue(visit),
    updateIfStatus: vi.fn(async (updated) => updated),
  };
  const activityLog = { record: vi.fn().mockResolvedValue(undefined) };
  const useCase = new RescheduleVisitUseCase(
    visitRepository as unknown as VisitRepository,
    activityLog,
  );
  return { visitRepository, activityLog, useCase };
}

const actor = { id: 'director-1', role: UserRole.Director };

describe('RescheduleVisitUseCase', () => {
  it('updates the scheduled date of a scheduled visit', async () => {
    const { visitRepository, activityLog, useCase } = setup();

    const updated = await useCase.execute(actor, 1, future);

    expect(updated.scheduledDate).toBe(future);
    expect(visitRepository.updateIfStatus).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledDate: future }),
      VisitStatus.Scheduled,
    );
    expect(activityLog.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'visit.rescheduled', userId: actor.id, clientId: 10,
    }));
  });

  it('fails when the visit does not exist', async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(actor, 1, future)).rejects.toThrow(NotFoundError);
  });

  it.each([VisitStatus.Visited, VisitStatus.Cancelled])(
    'rejects a visit that is already %s',
    async (status) => {
      const { visitRepository, useCase } = setup(scheduledVisit(status));

      await expect(useCase.execute(actor, 1, future)).rejects.toThrow(
        ValidationError,
      );
      expect(visitRepository.updateIfStatus).not.toHaveBeenCalled();
    },
  );

  it('rejects a past new date', async () => {
    const { visitRepository, useCase } = setup();

    await expect(useCase.execute(actor, 1, past)).rejects.toThrow(ValidationError);
    expect(visitRepository.updateIfStatus).not.toHaveBeenCalled();
  });

  it('fails when the status changed concurrently (e.g. HU-09 marked it visited)', async () => {
    const { visitRepository, activityLog, useCase } = setup();
    visitRepository.updateIfStatus.mockResolvedValue(null);

    await expect(useCase.execute(actor, 1, future)).rejects.toThrow(ValidationError);
    expect(activityLog.record).not.toHaveBeenCalled();
  });
});
