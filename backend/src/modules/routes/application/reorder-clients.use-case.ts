import {
  NotFoundError,
  ValidationError,
} from '../../../shared/domain/errors/index.js';

import type {
  RouteRepository,
  VisitOrderItem,
} from '../domain/route.repository.js';

export class ReorderClientsUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  /** `items` must contain every client of the route exactly once. */
  async execute(routeId: number, items: VisitOrderItem[]): Promise<void> {
    const route = await this.routeRepository.findById(routeId);
    if (!route) {
      throw new NotFoundError('Route not found');
    }

    const clientIds = new Set(items.map((item) => item.clientId));
    if (clientIds.size !== items.length) {
      throw new ValidationError('A client appears more than once');
    }
    const visitOrders = new Set(items.map((item) => item.visitOrder));
    if (visitOrders.size !== items.length) {
      throw new ValidationError('A visitOrder appears more than once');
    }

    const current = await this.routeRepository.findClients(routeId);
    const sameClients =
      current.length === items.length &&
      current.every((association) => clientIds.has(association.clientId));
    if (!sameClients) {
      throw new ValidationError(
        'The order must include every client of the route and no others',
      );
    }

    await this.routeRepository.reorder(routeId, items);
  }
}
