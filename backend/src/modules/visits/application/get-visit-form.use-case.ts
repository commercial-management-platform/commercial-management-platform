import { NotFoundError } from '../../../shared/domain/errors/index.js';
import { businessDateOf, isoWeekNumber, weekdayOf } from '../../../shared/domain/time/business-time.js';
import type { VisitForm } from '../domain/visit-form.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitReferencesPort } from './ports/visit-references.port.js';
import type { VisitActor } from './types/visit-actor.js';
import { findVisibleVisit } from './visit-visibility.js';

export class GetVisitFormUseCase {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly references: VisitReferencesPort,
  ) {}

  /** Everything the advisor needs before starting the visit (CA-04), pre-filled. */
  async execute(actor: VisitActor, visitId: number): Promise<VisitForm> {
    const visit = await findVisibleVisit(this.visitRepository, actor, visitId);

    const client = await this.references.findClientDetails(visit.clientId);
    if (!client) {
      // The foreign key guarantees the client exists; defensive only.
      throw new NotFoundError('Visit not found');
    }
    const advisor = await this.references.findAdvisorDetails(visit.advisorId);
    if (!advisor) {
      throw new NotFoundError('Visit not found');
    }

    const [primaryContact, route, zone] = await Promise.all([
      this.references.findPrimaryContact(visit.clientId),
      visit.routeId !== null
        ? this.references.findRouteName(visit.routeId)
        : Promise.resolve(null),
      client.zoneId !== null
        ? this.references.findZone(client.zoneId)
        : Promise.resolve(null),
    ]);

    const date = businessDateOf(visit.scheduledDate);

    return {
      visit: {
        id: visit.id!,
        scheduledDate: visit.scheduledDate,
        status: visit.status,
        visitOrder: visit.visitOrder,
        startedAt: visit.startedAt,
        locationConfirmed: visit.locationConfirmed,
      },
      client: {
        id: client.id,
        businessName: client.businessName,
        tradeName: client.tradeName,
        address: client.address,
        latitude: client.latitude,
        longitude: client.longitude,
      },
      primaryContact,
      route,
      zone,
      advisor,
      week: {
        date,
        isoWeek: isoWeekNumber(date),
        weekday: weekdayOf(date),
      },
    };
  }
}
