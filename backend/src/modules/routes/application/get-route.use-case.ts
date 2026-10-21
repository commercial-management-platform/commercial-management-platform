import type { RouteRepository } from '../domain/route.repository.js';
import type { Route } from '../domain/route.js';
import { findVisibleRoute } from './route-visibility.js';
import type { RouteActor } from './types/route-actor.js';

export class GetRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(actor: RouteActor, id: number): Promise<Route> {
    return findVisibleRoute(this.routeRepository, actor, id);
  }
}
