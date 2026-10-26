import type { RouteRepository } from '../domain/route.repository.js';
import type { RouteClient } from '../domain/route-client.js';
import { findVisibleRoute } from './route-visibility.js';
import type { RouteActor } from './types/route-actor.js';

export class GetRouteClientsUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(actor: RouteActor, routeId: number): Promise<RouteClient[]> {
    await findVisibleRoute(this.routeRepository, actor, routeId);
    return this.routeRepository.findClients(routeId);
  }
}
