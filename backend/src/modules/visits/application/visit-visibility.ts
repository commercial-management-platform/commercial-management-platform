import { NotFoundError } from '../../../shared/domain/errors/index.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import type { Visit } from '../domain/visit.js';
import type { VisitRepository } from '../domain/visit.repository.js';
import type { VisitActor } from './types/visit-actor.js';

/**
 * Returns the visit when the actor can see it. An advisor only sees their
 * own visits; any other visit answers as not found (404 instead of 403) so
 * its existence is not revealed.
 */
export async function findVisibleVisit(
  visits: VisitRepository,
  actor: VisitActor,
  visitId: number,
): Promise<Visit> {
  const visit = await visits.findById(visitId);
  if (
    !visit ||
    (actor.role === UserRole.Advisor &&
      !(await visits.isAssignedToAdvisorUser(visitId, actor.id)))
  ) {
    throw new NotFoundError('Visit not found');
  }
  return visit;
}
