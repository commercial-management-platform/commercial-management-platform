import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import type { RouteRepository } from '../domain/route.repository.js';
import type { Route } from '../domain/route.js';
import type { RouteActor } from './types/route-actor.js';

export class ListRoutesUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  /** An advisor only lists the routes assigned to them. */
  async execute(actor: RouteActor): Promise<Route[]> {
    if (actor.role === UserRole.Advisor) {
      return this.routeRepository.findAll({ advisorUserId: actor.id });
    }
    return this.routeRepository.findAll();
  }
}
