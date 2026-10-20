import { NotFoundError } from '../../../shared/domain/errors/index.js';

import type { RouteRepository } from '../domain/route.repository.js';
import type { Route } from '../domain/route.js';

export class GetRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(id: number): Promise<Route> {
    const route = await this.routeRepository.findById(id);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    return route;
  }
}
