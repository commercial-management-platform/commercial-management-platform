import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { Contact } from '../../domain/entities/contact.js';
import type { ContactRepository } from '../../domain/repositories/contact.repository.js';
import { findVisibleClient } from '../client-visibility.js';
import type { ContactActor } from '../types/contact-actor.js';

export interface GetContactInput {
  actor: ContactActor;
  clientId: number;
  contactId: number;
}

/**
 * Returns one contact of a client. A contact that belongs to another client
 * answers as not found, so it is not revealed.
 */
export class GetContactUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly contacts: ContactRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(input: GetContactInput): Promise<Contact> {
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

    return contact;
  }
}
