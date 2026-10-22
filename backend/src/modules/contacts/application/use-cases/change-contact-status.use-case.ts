import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { Contact } from '../../domain/entities/contact.js';
import type { ContactRepository } from '../../domain/repositories/contact.repository.js';
import { findVisibleClient } from '../client-visibility.js';
import type { ContactActor } from '../types/contact-actor.js';

export interface ChangeContactStatusInput {
  actor: ContactActor;
  clientId: number;
  contactId: number;
  /** true to reactivate, false to deactivate. */
  active: boolean;
}

/**
 * Activates or deactivates a contact. Deactivation is a soft delete: the
 * contact and its commercial history are never removed, only the `active`
 * flag flips.
 *
 * Deactivating the primary contact clears its `isPrimary` flag, so the client
 * keeps a single main contact and the change is tracked in the activity log.
 */
export class ChangeContactStatusUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly contacts: ContactRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: ChangeContactStatusInput): Promise<Contact> {
    await findVisibleClient(
      this.clients,
      this.advisorAccess,
      input.actor,
      input.clientId,
    );

    const contact = await this.contacts.findByIdForClient(
      input.clientId,
      input.contactId,
    );
    if (!contact) {
      throw new NotFoundError(
        `Contact with id '${input.contactId}' not found for client '${input.clientId}'`,
      );
    }

    // The main contact of a client is always an active contact.
    const demotes = input.active === false && contact.isPrimary;

    const updated = await this.contacts.update(input.contactId, {
      active: input.active,
      ...(demotes ? { isPrimary: false } : {}),
    });

    await this.activityLog.record({
      action: 'contact.status_changed',
      userId: input.actor.id,
      clientId: input.clientId,
      description: `Contact '${updated.name}' ${input.active ? 'activated' : 'deactivated'}`,
      occurredAt: new Date(),
    });

    if (demotes) {
      await this.activityLog.record({
        action: 'contact.primary_changed',
        userId: input.actor.id,
        clientId: input.clientId,
        description: `Contact '${updated.name}' is no longer the primary contact of client ${input.clientId}`,
        occurredAt: new Date(),
      });
    }

    return updated;
  }
}
