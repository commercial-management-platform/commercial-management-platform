import { ValidationError } from '../../../shared/domain/errors/index.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitReferencesPort } from './ports/visit-references.port.js';
import { ScheduleVisitUseCase } from './schedule-visit.use-case.js';

const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);

const input = { clientId: 10, advisorId: 2, scheduledDate: future };

function setup() {
  const visitRepository = {
    save: vi.fn(async (visit) => visit),
  };
  const references = {
    findClient: vi.fn().mockResolvedValue({ id: 10, active: true }),
    findAdvisor: vi.fn().mockResolvedValue({ id: 2, active: true }),
    findRoute: vi.fn().mockResolvedValue({
      id: 5,
      advisorId: 2,
      active: true,
      suggestedStartTime: null,
    }),
    isClientOnRoute: vi.fn().mockResolvedValue(true),
    findRouteClients: vi.fn(),
  };
  const useCase = new ScheduleVisitUseCase(
    visitRepository as unknown as VisitRepository,
    references as VisitReferencesPort,
  );
  return { visitRepository, references, useCase };
}

describe('ScheduleVisitUseCase', () => {
  it('schedules the visit when the client and advisor are active', async () => {
    const { visitRepository, useCase } = setup();

    const visit = await useCase.execute(input);

    expect(visitRepository.save).toHaveBeenCalledOnce();
    expect(visit).toMatchObject({
      clientId: 10,
      advisorId: 2,
      routeId: null,
      status: 'scheduled',
    });
  });

  it('rejects a past scheduled date', async () => {
    const { visitRepository, useCase } = setup();

    await expect(
      useCase.execute({ ...input, scheduledDate: past }),
    ).rejects.toThrow(ValidationError);
    expect(visitRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a client that does not exist', async () => {
    const { references, visitRepository, useCase } = setup();
    references.findClient.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(
      new ValidationError("Client '10' does not exist"),
    );
    expect(visitRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an inactive client', async () => {
    const { references, visitRepository, useCase } = setup();
    references.findClient.mockResolvedValue({ id: 10, active: false });

    await expect(useCase.execute(input)).rejects.toThrow(
      new ValidationError("Client '10' is inactive"),
    );
    expect(visitRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an advisor that does not exist or is inactive', async () => {
    const { references, visitRepository, useCase } = setup();
    references.findAdvisor.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(
      new ValidationError("Advisor '2' does not exist"),
    );
    expect(visitRepository.save).not.toHaveBeenCalled();
  });

  describe('with routeId', () => {
    const withRoute = { ...input, routeId: 5 };

    it('schedules the visit when the client belongs to the route', async () => {
      const { visitRepository, useCase } = setup();

      const visit = await useCase.execute(withRoute);

      expect(visit).toMatchObject({ routeId: 5 });
    });

    it('rejects a route that does not exist or is inactive', async () => {
      const { references, visitRepository, useCase } = setup();
      references.findRoute.mockResolvedValue(null);

      await expect(useCase.execute(withRoute)).rejects.toThrow(
        new ValidationError("Route '5' does not exist"),
      );
      expect(visitRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a client that is not on the route', async () => {
      const { references, visitRepository, useCase } = setup();
      references.isClientOnRoute.mockResolvedValue(false);

      await expect(useCase.execute(withRoute)).rejects.toThrow(
        new ValidationError("Client '10' is not on route '5'"),
      );
      expect(visitRepository.save).not.toHaveBeenCalled();
    });
  });
});
