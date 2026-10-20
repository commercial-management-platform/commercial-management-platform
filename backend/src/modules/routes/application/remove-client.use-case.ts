import { NotFoundError } from '../../../shared/domain/errors/index.js';

import type { RouteRepository } from '../domain/route.repository.js';

export class RemoveClientUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(routeId: number, clientId: number): Promise<void> {
    const route = await this.routeRepository.findById(routeId);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    const association = await this.routeRepository.findAssociation(routeId, clientId);
    if (!association) {
      throw new NotFoundError('Association not found');
    }
    await this.routeRepository.removeAssociation(routeId, clientId);
  }
}
