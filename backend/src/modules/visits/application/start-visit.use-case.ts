import { ValidationError } from '../../../shared/domain/errors/index.js';
import { haversineDistanceMeters } from '../domain/geo.js';
import { VisitStatus } from '../domain/visit-status.js';
import type { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitReferencesPort } from './ports/visit-references.port.js';
import type { VisitActor } from './types/visit-actor.js';
import { findVisibleVisit } from './visit-visibility.js';

export class StartVisitUseCase {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly references: VisitReferencesPort,
    /** VISIT_CHECKIN_RADIUS_METERS; also read by the controller for the response. */
    public readonly checkInRadiusMeters: number,
  ) {}

  /**
   * Starts a scheduled visit, the day it is due. The advisor only sends
   * their location (or none); the backend alone computes the distance to
   * the client and whether it confirms the check-in. Calling it again while
   * the visit is still scheduled retries the location.
   */
  async execute(
    actor: VisitActor,
    visitId: number,
    input: { latitude: number | null; longitude: number | null },
  ): Promise<Visit> {
    const visit = await findVisibleVisit(this.visitRepository, actor, visitId);

    let distanceMeters: number | null = null;
    let confirmed = false;
    if (input.latitude !== null && input.longitude !== null) {
      const client = await this.references.findClientDetails(visit.clientId);
      if (client && client.latitude !== null && client.longitude !== null) {
        distanceMeters = haversineDistanceMeters(
          { latitude: input.latitude, longitude: input.longitude },
          { latitude: client.latitude, longitude: client.longitude },
        );
        confirmed = distanceMeters <= this.checkInRadiusMeters;
      }
    }

    visit.start({
      latitude: input.latitude,
      longitude: input.longitude,
      distanceMeters,
      confirmed,
      now: new Date(),
    });

    const updated = await this.visitRepository.updateIfStatus(
      visit,
      VisitStatus.Scheduled,
    );
    if (!updated) {
      throw new ValidationError('The visit is no longer scheduled');
    }
    return updated;
  }
}
