import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { Client } from '../../domain/entities/client.js';
import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../ports/advisor-client-access.port.js';
import type { ClientActor } from '../types/client-actor.js';

export interface GetClientByIdInput {
  actor: ClientActor;
  clientId: number;
}

export class GetClientByIdUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(input: GetClientByIdInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    if (!client) {
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }

    if (
      input.actor.role === UserRole.Advisor &&
      !(await this.advisorAccess.canAccess(input.actor.id, input.clientId))
    ) {
      // Answer as not found so clients outside the advisor's routes are not
      // revealed (404 instead of 403).
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }

    return client;
  }
}
