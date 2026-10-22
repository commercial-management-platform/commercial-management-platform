import { ValidationError, NotFoundError } from '../../../shared/domain/errors/index.js';
import { businessDateTimeToInstant, businessToday } from '../../../shared/domain/time/business-time.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { VisitStatus } from '../domain/visit-status.js';
import { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitReferencesPort } from './ports/visit-references.port.js';
import { StartVisitUseCase } from './start-visit.use-case.js';

const advisorActor = { id: 'usr_advisor_1', role: UserRole.Advisor };
const RADIUS_METERS = 15;

function todayVisit(): Visit {
  return Visit.schedule({
    clientId: 10,
    advisorId: 2,
    routeId: null,
    scheduledDate: businessDateTimeToInstant(businessToday(), '09:00'),
    visitOrder: null,
  });
}

function setup(visit: Visit = todayVisit()) {
  const visitRepository = {
    findById: vi.fn().mockResolvedValue(visit),
    isAssignedToAdvisorUser: vi.fn().mockResolvedValue(true),
    updateIfStatus: vi.fn(async (updated: Visit) => updated),
  };
  const references = {
    findClientDetails: vi.fn().mockResolvedValue({
      id: 10,
      businessName: 'Client',
      tradeName: null,
      address: null,
      latitude: 4.711,
      longitude: -74.0721,
      zoneId: null,
    }),
  };
  const useCase = new StartVisitUseCase(
    visitRepository as unknown as VisitRepository,
    references as unknown as VisitReferencesPort,
    RADIUS_METERS,
  );
  return { visitRepository, references, useCase };
}

describe('StartVisitUseCase', () => {
  it('confirms the location when inside the check-in radius', async () => {
    const { visitRepository, useCase } = setup();

    const result = await useCase.execute(advisorActor, 1, {
      latitude: 4.711,
      longitude: -74.0721,
    });

    expect(result.checkInDistanceMeters).toBe(0);
    expect(result.locationConfirmed).toBe(true);
    expect(visitRepository.updateIfStatus).toHaveBeenCalledWith(
      expect.objectContaining({ locationConfirmed: true }),
      VisitStatus.Scheduled,
    );
  });

  it('does not confirm the location when outside the check-in radius', async () => {
    const { useCase } = setup();

    // About 1.1 km north of the client.
    const result = await useCase.execute(advisorActor, 1, {
      latitude: 4.721,
      longitude: -74.0721,
    });

    expect(result.checkInDistanceMeters).toBeGreaterThan(RADIUS_METERS);
    expect(result.locationConfirmed).toBe(false);
  });

  it('leaves distance null and unconfirmed when no location is sent', async () => {
    const { references, useCase } = setup();

    const result = await useCase.execute(advisorActor, 1, {
      latitude: null,
      longitude: null,
    });

    expect(result.checkInDistanceMeters).toBeNull();
    expect(result.locationConfirmed).toBe(false);
    expect(references.findClientDetails).not.toHaveBeenCalled();
  });

  it('leaves distance null when the client has no coordinates', async () => {
    const { references, useCase } = setup();
    references.findClientDetails.mockResolvedValue({
      id: 10,
      businessName: 'Client',
      tradeName: null,
      address: null,
      latitude: null,
      longitude: null,
      zoneId: null,
    });

    const result = await useCase.execute(advisorActor, 1, {
      latitude: 4.711,
      longitude: -74.0721,
    });

    expect(result.checkInDistanceMeters).toBeNull();
    expect(result.locationConfirmed).toBe(false);
  });

  it('rejects a visit scheduled for a different day', async () => {
    const other = Visit.schedule({
      clientId: 10,
      advisorId: 2,
      routeId: null,
      scheduledDate: businessDateTimeToInstant('2099-01-02', '09:00'),
      visitOrder: null,
    });
    const { visitRepository, useCase } = setup(other);

    await expect(
      useCase.execute(advisorActor, 1, { latitude: null, longitude: null }),
    ).rejects.toThrow(ValidationError);
    expect(visitRepository.updateIfStatus).not.toHaveBeenCalled();
  });

  it("answers 404 for another advisor's visit", async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.isAssignedToAdvisorUser.mockResolvedValue(false);

    await expect(
      useCase.execute(advisorActor, 1, { latitude: null, longitude: null }),
    ).rejects.toThrow(NotFoundError);
  });

  it('fails when the status changed concurrently', async () => {
    const { visitRepository, useCase } = setup();
    visitRepository.updateIfStatus.mockResolvedValue(null);

    await expect(
      useCase.execute(advisorActor, 1, { latitude: null, longitude: null }),
    ).rejects.toThrow(ValidationError);
  });
});
