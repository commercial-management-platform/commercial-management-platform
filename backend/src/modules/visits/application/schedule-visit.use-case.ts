import { ValidationError } from '../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../shared/application/ports/activity-log.port.js';
import { businessDateOf } from '../../../shared/domain/time/business-time.js';
import { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitActor } from './types/visit-actor.js';
import type { VisitReferencesPort } from './ports/visit-references.port.js';
import { assertNotPast } from './visit-dates.js';

export class ScheduleVisitUseCase {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly references: VisitReferencesPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: {
    actor: VisitActor;
    clientId: number;
    advisorId: number;
    scheduledDate: Date;
    routeId?: number | null;
  }): Promise<Visit> {
    assertNotPast(input.scheduledDate);

    const client = await this.references.findClient(input.clientId);
    assertActive('Client', input.clientId, client);
    const advisor = await this.references.findAdvisor(input.advisorId);
    assertActive('Advisor', input.advisorId, advisor);

    const routeId = input.routeId ?? null;
    if (routeId !== null) {
      const route = await this.references.findRoute(routeId);
      assertActive('Route', routeId, route);
      if (!(await this.references.isClientOnRoute(routeId, input.clientId))) {
        throw new ValidationError(
          `Client '${input.clientId}' is not on route '${routeId}'`,
        );
      }
    }

    const saved = await this.visitRepository.save(
      Visit.schedule({
        clientId: input.clientId,
        advisorId: input.advisorId,
        routeId,
        scheduledDate: input.scheduledDate,
        visitOrder: null,
      }),
    );
    await this.activityLog.record({
      action: 'visit.scheduled',
      userId: input.actor.id,
      clientId: saved.clientId,
      description: `Visit scheduled for ${businessDateOf(saved.scheduledDate)}`,
      occurredAt: new Date(),
    });
    return saved;
  }
}

function assertActive(
  kind: 'Client' | 'Advisor' | 'Route',
  id: number,
  reference: { active: boolean } | null,
): void {
  if (!reference) {
    throw new ValidationError(`${kind} '${id}' does not exist`);
  }
  if (!reference.active) {
    throw new ValidationError(`${kind} '${id}' is inactive`);
  }
}
