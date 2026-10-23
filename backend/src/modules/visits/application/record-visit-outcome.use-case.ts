import { ValidationError } from '../../../shared/domain/errors/index.js';
import type { ActivityLogPort } from '../../../shared/application/ports/activity-log.port.js';
import type {
  CatalogLookupPort,
  CatalogName,
} from '../../catalogs/application/ports/catalog-lookup.port.js';
import type { InterestLevel, InterestReason } from '../domain/visit-interest.js';
import { VisitOutcome } from '../domain/visit-outcome.js';
import { VisitStatus } from '../domain/visit-status.js';
import type { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitActor } from './types/visit-actor.js';
import { findVisibleVisit } from './visit-visibility.js';

export interface RecordedVisitOutcome {
  visit: Visit;
  outcome: VisitOutcome;
}

export class RecordVisitOutcomeUseCase {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly catalogs: CatalogLookupPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(
    actor: VisitActor,
    visitId: number,
    input: {
      visitObjectiveId: number;
      visitTypeId: number;
      visitResultId: number;
      interestLevel: InterestLevel;
      interestReason: InterestReason | null;
      observation: string;
      competitorMentioned: string | null;
      /** Used only when the visit was never started with /start. */
      startedAt: Date | null;
      finishedAt: Date | null;
    },
  ): Promise<RecordedVisitOutcome> {
    const observation = input.observation.trim();
    if (observation.length === 0) {
      throw new ValidationError('observation must not be empty');
    }

    const visit = await findVisibleVisit(this.visitRepository, actor, visitId);

    await assertActiveCatalog(
      this.catalogs,
      'visit_objective',
      input.visitObjectiveId,
    );
    await assertActiveCatalog(this.catalogs, 'visit_type', input.visitTypeId);
    await assertActiveCatalog(this.catalogs, 'visit_result', input.visitResultId);

    visit.recordOutcome({
      visitObjectiveId: input.visitObjectiveId,
      visitTypeId: input.visitTypeId,
      interestLevel: input.interestLevel,
      interestReason: input.interestReason,
      competitorMentioned: input.competitorMentioned,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      now: new Date(),
    });

    const outcome = VisitOutcome.record({
      visitId: visit.id!,
      visitResultId: input.visitResultId,
      observation,
    });

    const result = await this.visitRepository.recordOutcome(
      visit,
      outcome,
      VisitStatus.Scheduled,
    );
    if (!result) {
      throw new ValidationError(
        'The visit is no longer scheduled, or already has a result',
      );
    }

    await this.activityLog.record({
      action: 'visit.completed',
      userId: actor.id,
      clientId: result.visit.clientId,
      description: `Visit completed with result '${result.outcome.visitResultId}'`,
      occurredAt: new Date(),
    });
    // HU-10: crear el follow_up si viene próximo seguimiento
    // HU-12 y HU-14: cotización y pedido vinculados con visit_id

    return result;
  }
}

async function assertActiveCatalog(
  catalogs: CatalogLookupPort,
  catalog: CatalogName,
  id: number,
): Promise<void> {
  if (!(await catalogs.isActive(catalog, id))) {
    throw new ValidationError(`Unknown or inactive ${catalog} id '${id}'`);
  }
}
