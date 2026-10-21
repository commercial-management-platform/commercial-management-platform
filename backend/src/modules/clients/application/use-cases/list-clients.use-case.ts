import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import type { Client } from '../../domain/entities/client.js';
import type {
  ClientFilterOptions,
  ClientRepository,
} from '../../domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../ports/advisor-client-access.port.js';
import type { ClientActor } from '../types/client-actor.js';

export interface ListClientsInput {
  actor: ClientActor;
  search?: string;
  active?: boolean;
  zoneId?: number;
  clientTypeId?: number;
  clientPotentialId?: number;
  clientStatusId?: number;
}

export class ListClientsUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(input: ListClientsInput): Promise<Client[]> {
    const filters: ClientFilterOptions = {
      search: input.search,
      active: input.active,
      zoneId: input.zoneId,
      clientTypeId: input.clientTypeId,
      clientPotentialId: input.clientPotentialId,
      clientStatusId: input.clientStatusId,
    };

    // Advisors only see the clients assigned to their routes (route_client).
    if (input.actor.role === UserRole.Advisor) {
      filters.ids = await this.advisorAccess.getAccessibleClientIds(
        input.actor.id,
      );
    }

    return this.clients.findAll(filters);
  }
}
