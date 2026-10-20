import type { RouteRepository } from '../domain/route.repository.js';
import type { Route } from '../domain/route.js';

export class ListRoutesUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(): Promise<Route[]> {
    return this.routeRepository.findAll();
  }
}
