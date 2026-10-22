import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import { VisitStatus } from '../domain/visit-status.js';
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
  const useCase = new RescheduleVisitUseCase(
    visitRepository as unknown as VisitRepository,
  );
  return { visitRepository, useCase };
}

describe('RescheduleVisitUseCase', () => {
  it('updates the scheduled date of a scheduled visit', async () => {
    const { visitRepository, useCase } = setup();

    const updated = await useCase.execute(1, future);

    expect(updated.scheduledDate).toBe(future);
    expect(visitRepository.updateIfStatus).toHaveBeenCalledWith(
      expect.objectContaining({ scheduledDate: future }),
      VisitStatus.Scheduled,
    );
  });

  it('fails when the visit does not exist', async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(1, future)).rejects.toThrow(NotFoundError);
  });

  it.each([VisitStatus.Visited, VisitStatus.Cancelled])(
    'rejects a visit that is already %s',
    async (status) => {
      const { visitRepository, useCase } = setup(scheduledVisit(status));

      await expect(useCase.execute(1, future)).rejects.toThrow(
        ValidationError,
      );
      expect(visitRepository.updateIfStatus).not.toHaveBeenCalled();
    },
  );

  it('rejects a past new date', async () => {
    const { visitRepository, useCase } = setup();

    await expect(useCase.execute(1, past)).rejects.toThrow(ValidationError);
    expect(visitRepository.updateIfStatus).not.toHaveBeenCalled();
  });

  it('fails when the status changed concurrently (e.g. HU-09 marked it visited)', async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.updateIfStatus.mockResolvedValue(null);

    await expect(useCase.execute(1, future)).rejects.toThrow(ValidationError);
  });
});
