import {
  ConflictError,
  NotFoundError,
} from '../../../shared/domain/errors/index.js';

import type { RouteRepository } from '../domain/route.repository.js';
import type { ClientRepository } from '../../clients/domain/client.repository.js';

export class AssociateClientUseCase {
  constructor(
    private readonly routeRepository: RouteRepository,
    private readonly clientRepository: ClientRepository,
  ) {}

  async execute(routeId: number, clientId: number): Promise<void> {
    const route = await this.routeRepository.findById(routeId);
    if (!route) {
      throw new NotFoundError('Route not found');
    }
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundError('Client not found');
    }
    const existing = await this.routeRepository.findAssociation(
      routeId,
      clientId,
    );
    if (existing) {
      throw new ConflictError('Client already associated to route');
    }
    const clients = await this.routeRepository.findClients(routeId);
    const nextOrder = clients.length
      ? Math.max(...clients.map((c) => c.visitOrder)) + 1
      : 1;
    await this.routeRepository.associate(routeId, clientId, nextOrder);
  }
}
