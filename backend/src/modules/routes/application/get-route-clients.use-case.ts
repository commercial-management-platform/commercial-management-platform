import { NotFoundError } from '../../../shared/domain/errors/index.js';

import type { RouteRepository } from '../domain/route.repository.js';
import type { RouteClient } from '../domain/route-client.js';

export class GetRouteClientsUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(routeId: number): Promise<RouteClient[]> {
    const route = await this.routeRepository.findById(routeId);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    return this.routeRepository.findClients(routeId);
  }
}
