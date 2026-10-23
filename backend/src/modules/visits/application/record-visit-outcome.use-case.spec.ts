import { NotFoundError, ValidationError } from '../../../shared/domain/errors/index.js';
import { businessDateTimeToInstant, businessToday } from '../../../shared/domain/time/business-time.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { InterestLevel } from '../domain/visit-interest.js';
import { VisitStatus } from '../domain/visit-status.js';
import { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import { RecordVisitOutcomeUseCase } from './record-visit-outcome.use-case.js';

const advisorActor = { id: 'usr_advisor_1', role: UserRole.Advisor };

const input = {
  visitObjectiveId: 1,
  visitTypeId: 2,
  visitResultId: 3,
  interestLevel: InterestLevel.High,
  interestReason: null,
  observation: 'Interested in a bulk order',
  competitorMentioned: null,
  startedAt: null,
  finishedAt: null,
};

function todayVisit(): Visit {
  const visit = Visit.schedule({
    clientId: 10,
    advisorId: 2,
    routeId: null,
    scheduledDate: businessDateTimeToInstant(businessToday(), '09:00'),
    visitOrder: null,
  });
  // A visit always has an id once persisted; the fakes skip the repository.
  return new Visit({ ...visit, id: 1 });
}

function setup(visit: Visit = todayVisit()) {
  const visitRepository = {
    findById: vi.fn().mockResolvedValue(visit),
    isAssignedToAdvisorUser: vi.fn().mockResolvedValue(true),
    recordOutcome: vi.fn(async (updatedVisit: Visit, outcome: unknown) => ({
      visit: updatedVisit,
      outcome,
    })),
  };
  const catalogs = { isActive: vi.fn().mockResolvedValue(true) };
  const activityLog = { record: vi.fn().mockResolvedValue(undefined) };
  const useCase = new RecordVisitOutcomeUseCase(
    visitRepository as unknown as VisitRepository,
    catalogs,
    activityLog,
  );
  return { visitRepository, catalogs, activityLog, useCase };
}

describe('RecordVisitOutcomeUseCase', () => {
  it('records the outcome and marks the visit visited', async () => {
    const { visitRepository, activityLog, useCase } = setup();

    const result = await useCase.execute(advisorActor, 1, input);

    expect(result.visit.status).toBe(VisitStatus.Visited);
    expect(result.outcome).toMatchObject({
      visitId: 1,
      visitResultId: 3,
      observation: 'Interested in a bulk order',
    });
    expect(visitRepository.recordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ status: VisitStatus.Visited }),
      expect.objectContaining({ visitResultId: 3 }),
      VisitStatus.Scheduled,
    );
    expect(activityLog.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'visit.completed', userId: advisorActor.id, clientId: 10,
      description: "Visit completed with result '3'",
    }));
  });

  it('trims the observation', async () => {
    const { useCase } = setup();

    const result = await useCase.execute(advisorActor, 1, {
      ...input,
      observation: '  padded  ',
    });

    expect(result.outcome.observation).toBe('padded');
  });

  it('rejects an empty (whitespace-only) observation', async () => {
    const { visitRepository, useCase } = setup();

    await expect(
      useCase.execute(advisorActor, 1, { ...input, observation: '   ' }),
    ).rejects.toThrow(ValidationError);
    expect(visitRepository.recordOutcome).not.toHaveBeenCalled();
  });

  it.each([
    ['visit_objective', 'visitObjectiveId'],
    ['visit_type', 'visitTypeId'],
    ['visit_result', 'visitResultId'],
  ])('rejects an unknown or inactive %s', async (catalog, field) => {
    const { visitRepository, catalogs, useCase } = setup();
    catalogs.isActive.mockImplementation(
      async (name: string) => name !== catalog,
    );

    await expect(useCase.execute(advisorActor, 1, input)).rejects.toThrow(
      new ValidationError(`Unknown or inactive ${catalog} id '${input[field as keyof typeof input]}'`),
    );
    expect(visitRepository.recordOutcome).not.toHaveBeenCalled();
  });

  it('rejects finishedAt before startedAt', async () => {
    const { visitRepository, useCase } = setup();
    const startedAt = businessDateTimeToInstant(businessToday(), '10:00');
    const finishedAt = businessDateTimeToInstant(businessToday(), '09:00');

    await expect(
      useCase.execute(advisorActor, 1, { ...input, startedAt, finishedAt }),
    ).rejects.toThrow(ValidationError);
    expect(visitRepository.recordOutcome).not.toHaveBeenCalled();
  });

  it('rejects a visit scheduled for a different day', async () => {
    const other = Visit.schedule({
      clientId: 10,
      advisorId: 2,
      routeId: null,
      scheduledDate: businessDateTimeToInstant('2099-01-02', '09:00'),
      visitOrder: null,
    });
    const { visitRepository, activityLog, useCase } = setup(other);

    await expect(useCase.execute(advisorActor, 1, input)).rejects.toThrow(
      ValidationError,
    );
    expect(visitRepository.recordOutcome).not.toHaveBeenCalled();
    expect(activityLog.record).not.toHaveBeenCalled();
  });

  it('rejects a visit that is not scheduled (already visited)', async () => {
    const visited = todayVisit();
    visited.recordOutcome({
      visitObjectiveId: 1,
      visitTypeId: 1,
      interestLevel: InterestLevel.Low,
      interestReason: null,
      competitorMentioned: null,
      startedAt: null,
      finishedAt: null,
      now: new Date(),
    });
    const { visitRepository, useCase } = setup(visited);

    await expect(useCase.execute(advisorActor, 1, input)).rejects.toThrow(
      ValidationError,
    );
    expect(visitRepository.recordOutcome).not.toHaveBeenCalled();
  });

  it("answers 404 for another advisor's visit", async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.isAssignedToAdvisorUser.mockResolvedValue(false);

    await expect(useCase.execute(advisorActor, 1, input)).rejects.toThrow(
      NotFoundError,
    );
  });

  it('fails when the status changed concurrently (e.g. a second outcome won the race)', async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.recordOutcome.mockResolvedValue(null);

    await expect(useCase.execute(advisorActor, 1, input)).rejects.toThrow(
      ValidationError,
    );
  });
});
