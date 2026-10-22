import { NotFoundError } from '../../../shared/domain/errors/index.js';
import { businessDateTimeToInstant } from '../../../shared/domain/time/business-time.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { VisitStatus } from '../domain/visit-status.js';
import { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import { GetVisitFormUseCase } from './get-visit-form.use-case.js';
import type { VisitReferencesPort } from './ports/visit-references.port.js';

const advisorActor = { id: 'usr_advisor_1', role: UserRole.Advisor };

const visit = new Visit({
  id: 1,
  clientId: 10,
  advisorId: 2,
  routeId: 5,
  scheduledDate: businessDateTimeToInstant('2026-10-22', '09:00'),
  visitOrder: 1,
  actualDate: null,
  status: VisitStatus.Scheduled,
  startedAt: null,
  finishedAt: null,
  checkInLatitude: null,
  checkInLongitude: null,
  checkInDistanceMeters: null,
  locationConfirmed: false,
  visitObjectiveId: null,
  visitTypeId: null,
  interestLevel: null,
  interestReason: null,
  competitorMentioned: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function setup() {
  const visitRepository = {
    findById: vi.fn().mockResolvedValue(visit),
    isAssignedToAdvisorUser: vi.fn().mockResolvedValue(true),
  };
  const references = {
    findClientDetails: vi.fn().mockResolvedValue({
      id: 10,
      businessName: 'Client 10',
      tradeName: 'Trade 10',
      address: 'Address 10',
      latitude: 4.711,
      longitude: -74.0721,
      zoneId: 1,
    }),
    findPrimaryContact: vi.fn().mockResolvedValue({
      name: 'Maria',
      phone: '600',
      mobile: '300',
      email: 'maria@cmp.com',
    }),
    findRouteName: vi.fn().mockResolvedValue({ id: 5, name: 'Route 5' }),
    findZone: vi.fn().mockResolvedValue({ id: 1, name: 'Norte' }),
    findAdvisorDetails: vi.fn().mockResolvedValue({ id: 2, name: 'Advisor 2' }),
  };
  const useCase = new GetVisitFormUseCase(
    visitRepository as unknown as VisitRepository,
    references as unknown as VisitReferencesPort,
  );
  return { visitRepository, references, useCase };
}

describe('GetVisitFormUseCase', () => {
  it('assembles the pre-filled form', async () => {
    const { useCase } = setup();

    const form = await useCase.execute(advisorActor, 1);

    expect(form).toMatchObject({
      visit: { id: 1, visitOrder: 1, startedAt: null, locationConfirmed: false },
      client: { id: 10, businessName: 'Client 10', tradeName: 'Trade 10' },
      primaryContact: { name: 'Maria' },
      route: { id: 5, name: 'Route 5' },
      zone: { id: 1, name: 'Norte' },
      advisor: { id: 2, name: 'Advisor 2' },
      week: { date: '2026-10-22', isoWeek: 43, weekday: 'Thursday' },
    });
  });

  it('skips the route and zone lookups when the visit has none', async () => {
    const noRouteVisit = Visit.schedule({
      clientId: 10,
      advisorId: 2,
      routeId: null,
      scheduledDate: businessDateTimeToInstant('2026-10-22', '09:00'),
      visitOrder: null,
    });
    const { visitRepository, references, useCase } = setup();
    visitRepository.findById.mockResolvedValue(noRouteVisit);
    references.findClientDetails.mockResolvedValue({
      id: 10,
      businessName: 'Client 10',
      tradeName: null,
      address: null,
      latitude: null,
      longitude: null,
      zoneId: null,
    });

    const form = await useCase.execute(advisorActor, 1);

    expect(form.route).toBeNull();
    expect(form.zone).toBeNull();
    expect(references.findRouteName).not.toHaveBeenCalled();
    expect(references.findZone).not.toHaveBeenCalled();
  });

  it('answers null for the primary contact when the client has none', async () => {
    const { references, useCase } = setup();
    references.findPrimaryContact.mockResolvedValue(null);

    const form = await useCase.execute(advisorActor, 1);

    expect(form.primaryContact).toBeNull();
  });

  it("answers 404 for another advisor's visit", async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.isAssignedToAdvisorUser.mockResolvedValue(false);

    await expect(useCase.execute(advisorActor, 1)).rejects.toThrow(
      NotFoundError,
    );
  });
});
