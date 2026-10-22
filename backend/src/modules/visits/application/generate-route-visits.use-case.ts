import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';
import {
  businessDateTimeToInstant,
  businessDayRange,
} from '../../../shared/domain/time/business-time.js';
import { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitReferencesPort } from './ports/visit-references.port.js';
import { assertNotPast, inBusinessTime } from './visit-dates.js';

export type SkipReason = 'inactive_client' | 'already_scheduled';

export interface GeneratedRouteVisits {
  created: Visit[];
  skipped: { clientId: number; reason: SkipReason }[];
}

export class GenerateRouteVisitsUseCase {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly references: VisitReferencesPort,
  ) {}

  /**
   * Creates one scheduled visit per client of the route on `date` (business
   * time), assigned to the route's advisor. Inactive clients and clients that
   * already have a scheduled visit that day are skipped, not rejected.
   */
  async execute(
    routeId: number,
    input: { date: string; time?: string | null },
  ): Promise<GeneratedRouteVisits> {
    const route = await this.references.findRoute(routeId);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    if (!route.active) {
      throw new ValidationError(`Route '${routeId}' is inactive`);
    }
    const advisor = await this.references.findAdvisor(route.advisorId);
    if (!advisor?.active) {
      throw new ValidationError(
        `The advisor '${route.advisorId}' of route '${routeId}' does not exist or is inactive`,
      );
    }

    // The route's suggested start time wins; the body time is the fallback.
    const time = route.suggestedStartTime ?? input.time ?? null;
    if (time === null) {
      throw new ValidationError(
        'The route has no suggested start time; send time as HH:mm',
      );
    }
    const scheduledDate = inBusinessTime(() =>
      businessDateTimeToInstant(input.date, time),
    );
    assertNotPast(scheduledDate);

    const routeClients = await this.references.findRouteClients(routeId);
    const skipped: GeneratedRouteVisits['skipped'] = [];
    const candidates = routeClients.filter((routeClient) => {
      if (!routeClient.clientActive) {
        skipped.push({
          clientId: routeClient.clientId,
          reason: 'inactive_client',
        });
      }
      return routeClient.clientActive;
    });

    const alreadyScheduled = new Set(
      candidates.length === 0
        ? []
        : await this.visitRepository.findClientIdsWithScheduledVisit(
            candidates.map((routeClient) => routeClient.clientId),
            businessDayRange(input.date),
          ),
    );
    const toCreate: Visit[] = [];
    for (const routeClient of candidates) {
      if (alreadyScheduled.has(routeClient.clientId)) {
        skipped.push({
          clientId: routeClient.clientId,
          reason: 'already_scheduled',
        });
        continue;
      }
      toCreate.push(
        Visit.schedule({
          clientId: routeClient.clientId,
          advisorId: route.advisorId,
          routeId,
          scheduledDate,
          visitOrder: routeClient.visitOrder,
        }),
      );
    }

    const created =
      toCreate.length === 0 ? [] : await this.visitRepository.saveAll(toCreate);
    // HU-16: registrar visit_scheduled (one per created visit)
    return { created, skipped };
  }
}
