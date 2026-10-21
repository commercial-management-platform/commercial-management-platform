import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { Client } from '../../domain/entities/client.js';
import type { ClientRepository } from '../../domain/repositories/client.repository.js';
import type { ActivityLogPort } from '../ports/activity-log.port.js';
import type { ClientActor } from '../types/client-actor.js';

export interface ChangeClientStatusInput {
  actor: ClientActor;
  clientId: number;
  /** true to reactivate, false to deactivate. */
  active: boolean;
}

/**
 * Activates or deactivates a client. Deactivation is a soft delete: the client
 * and its commercial history are never removed, only the `active` flag flips.
 * Restricted to admin and director at the controller level.
 */
export class ChangeClientStatusUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: ChangeClientStatusInput): Promise<Client> {
    const client = await this.clients.findById(input.clientId);
    if (!client) {
      throw new NotFoundError(`Client with id '${input.clientId}' not found`);
    }

    const updated = await this.clients.update(input.clientId, {
      active: input.active,
    });

    await this.activityLog.record({
      action: 'client.status_changed',
      userId: input.actor.id,
      // update() persists the entity; its id always exists.
      clientId: updated.id!,
      description: `Client '${updated.businessName}' (NIT ${updated.nit}) ${
        input.active ? 'reactivated' : 'deactivated'
      }`,
      occurredAt: new Date(),
    });

    return updated;
  }
}
