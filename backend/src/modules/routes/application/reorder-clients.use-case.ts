import { NotFoundError } from '../../../shared/domain/errors/index.js';

import type { RouteRepository } from '../domain/route.repository.js';

export class ReorderClientsUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(routeId: number, clientIds: number[]): Promise<void> {
    const route = await this.routeRepository.findById(routeId);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    await this.routeRepository.reorder(routeId, clientIds);
  }
}
