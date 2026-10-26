import { NotFoundError } from '../../../shared/domain/errors/index.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import type { Route } from '../domain/route.js';
import type { RouteRepository } from '../domain/route.repository.js';
import type { RouteActor } from './types/route-actor.js';

/**
 * Returns the route when the actor can see it. An advisor only sees the
 * routes assigned to them; any other route answers as not found (404 instead
 * of 403) so its existence is not revealed.
 */
export async function findVisibleRoute(
  routes: RouteRepository,
  actor: RouteActor,
  routeId: number,
): Promise<Route> {
  const route = await routes.findById(routeId);
  if (
    !route ||
    (actor.role === UserRole.Advisor &&
      !(await routes.isAssignedToAdvisorUser(routeId, actor.id)))
  ) {
    throw new NotFoundError('Route not found');
  }
  return route;
}
