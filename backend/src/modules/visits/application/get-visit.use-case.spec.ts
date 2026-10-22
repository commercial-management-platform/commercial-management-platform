import { NotFoundError } from '../../../shared/domain/errors/index.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { VisitStatus } from '../domain/visit-status.js';
import { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import { GetVisitUseCase } from './get-visit.use-case.js';

const admin = { id: 'usr_admin', role: UserRole.Admin };
const advisor = { id: 'usr_advisor', role: UserRole.Advisor };

const visit = new Visit({
  id: 1,
  clientId: 10,
  advisorId: 2,
  routeId: null,
  scheduledDate: new Date(),
  visitOrder: null,
  actualDate: null,
  status: VisitStatus.Scheduled,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function setup() {
  const visitRepository = {
    findById: vi.fn().mockResolvedValue(visit),
    isAssignedToAdvisorUser: vi.fn().mockResolvedValue(true),
  };
  const useCase = new GetVisitUseCase(
    visitRepository as unknown as VisitRepository,
  );
  return { visitRepository, useCase };
}

describe('GetVisitUseCase', () => {
  it('returns the visit to admin and director regardless of ownership', async () => {
    const { useCase } = setup();

    await expect(useCase.execute(admin, 1)).resolves.toBe(visit);
  });

  it('returns the visit to its own advisor', async () => {
    const { useCase } = setup();

    await expect(useCase.execute(advisor, 1)).resolves.toBe(visit);
  });

  it("answers 404 to an advisor for another advisor's visit", async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.isAssignedToAdvisorUser.mockResolvedValue(false);

    await expect(useCase.execute(advisor, 1)).rejects.toThrow(NotFoundError);
  });

  it('answers 404 when the visit does not exist', async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(admin, 999)).rejects.toThrow(NotFoundError);
  });
});
