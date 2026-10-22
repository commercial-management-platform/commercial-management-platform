import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import { GenerateRouteVisitsUseCase } from './generate-route-visits.use-case.js';
import type { VisitReferencesPort } from './ports/visit-references.port.js';

// Comfortably in the future, regardless of when the test runs.
const FUTURE_DATE = '2099-01-15';

function setup() {
  const visitRepository = {
    findClientIdsWithScheduledVisit: vi.fn().mockResolvedValue([]),
    saveAll: vi.fn(async (visits) => visits),
  };
  const references = {
    findClient: vi.fn(),
    findAdvisor: vi.fn().mockResolvedValue({ id: 2, active: true }),
    findRoute: vi.fn().mockResolvedValue({
      id: 5,
      advisorId: 2,
      active: true,
      suggestedStartTime: '08:00',
    }),
    isClientOnRoute: vi.fn(),
    findRouteClients: vi.fn().mockResolvedValue([
      { clientId: 10, visitOrder: 1, clientActive: true },
      { clientId: 11, visitOrder: 2, clientActive: true },
    ]),
  };
  const useCase = new GenerateRouteVisitsUseCase(
    visitRepository as unknown as VisitRepository,
    references as VisitReferencesPort,
  );
  return { visitRepository, references, useCase };
}

describe('GenerateRouteVisitsUseCase', () => {
  it('creates one visit per active client of the route', async () => {
    const { visitRepository, useCase } = setup();

    const result = await useCase.execute(5, { date: FUTURE_DATE });

    expect(visitRepository.saveAll).toHaveBeenCalledOnce();
    expect(result.created).toHaveLength(2);
    expect(result.skipped).toEqual([]);
    expect(result.created[0]).toMatchObject({
      clientId: 10,
      advisorId: 2,
      routeId: 5,
      visitOrder: 1,
    });
  });

  it('fails when the route does not exist', async () => {
    const { references, visitRepository, useCase } = setup();
    references.findRoute.mockResolvedValue(null);

    await expect(useCase.execute(5, { date: FUTURE_DATE })).rejects.toThrow(
      NotFoundError,
    );
    expect(visitRepository.saveAll).not.toHaveBeenCalled();
  });

  it('rejects an inactive route', async () => {
    const { references, visitRepository, useCase } = setup();
    references.findRoute.mockResolvedValue({
      id: 5,
      advisorId: 2,
      active: false,
      suggestedStartTime: '08:00',
    });

    await expect(useCase.execute(5, { date: FUTURE_DATE })).rejects.toThrow(
      ValidationError,
    );
    expect(visitRepository.saveAll).not.toHaveBeenCalled();
  });

  it('rejects an inactive advisor', async () => {
    const { references, visitRepository, useCase } = setup();
    references.findAdvisor.mockResolvedValue({ id: 2, active: false });

    await expect(useCase.execute(5, { date: FUTURE_DATE })).rejects.toThrow(
      ValidationError,
    );
    expect(visitRepository.saveAll).not.toHaveBeenCalled();
  });

  it('uses the body time when the route has no suggestedStartTime', async () => {
    const { references, useCase } = setup();
    references.findRoute.mockResolvedValue({
      id: 5,
      advisorId: 2,
      active: true,
      suggestedStartTime: null,
    });

    const result = await useCase.execute(5, {
      date: FUTURE_DATE,
      time: '09:30',
    });

    expect(result.created[0]?.scheduledDate.toISOString()).toBe(
      '2099-01-15T14:30:00.000Z',
    );
  });

  it('fails when the route has no time and none was sent', async () => {
    const { references, visitRepository, useCase } = setup();
    references.findRoute.mockResolvedValue({
      id: 5,
      advisorId: 2,
      active: true,
      suggestedStartTime: null,
    });

    await expect(useCase.execute(5, { date: FUTURE_DATE })).rejects.toThrow(
      ValidationError,
    );
    expect(visitRepository.saveAll).not.toHaveBeenCalled();
  });

  it('rejects a date that is already past in business time', async () => {
    const { visitRepository, useCase } = setup();

    await expect(
      useCase.execute(5, { date: '2000-01-01' }),
    ).rejects.toThrow(ValidationError);
    expect(visitRepository.saveAll).not.toHaveBeenCalled();
  });

  it('skips inactive clients without failing', async () => {
    const { references, useCase } = setup();
    references.findRouteClients.mockResolvedValue([
      { clientId: 10, visitOrder: 1, clientActive: true },
      { clientId: 11, visitOrder: 2, clientActive: false },
    ]);

    const result = await useCase.execute(5, { date: FUTURE_DATE });

    expect(result.created).toHaveLength(1);
    expect(result.skipped).toEqual([
      { clientId: 11, reason: 'inactive_client' },
    ]);
  });

  it('skips clients already scheduled that same business day', async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.findClientIdsWithScheduledVisit.mockResolvedValue([11]);

    const result = await useCase.execute(5, { date: FUTURE_DATE });

    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toMatchObject({ clientId: 10 });
    expect(result.skipped).toEqual([
      { clientId: 11, reason: 'already_scheduled' },
    ]);
  });

  it('does not call saveAll when every client is skipped', async () => {
    const { references, visitRepository, useCase } = setup();
    references.findRouteClients.mockResolvedValue([
      { clientId: 10, visitOrder: 1, clientActive: false },
    ]);

    const result = await useCase.execute(5, { date: FUTURE_DATE });

    expect(result.created).toEqual([]);
    expect(visitRepository.saveAll).not.toHaveBeenCalled();
  });
});
