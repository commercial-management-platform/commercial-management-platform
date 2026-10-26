import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { Contact } from '../../domain/entities/contact.js';
import type { ContactRepository } from '../../domain/repositories/contact.repository.js';
import { findVisibleClient } from '../client-visibility.js';
import type { ContactActor } from '../types/contact-actor.js';

export interface ListClientContactsInput {
  actor: ContactActor;
  clientId: number;
}

/**
 * Lists the contacts of a client. Advisors only reach the clients on their
 * routes.
 */
export class ListClientContactsUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly contacts: ContactRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
  ) {}

  async execute(input: ListClientContactsInput): Promise<Contact[]> {
    await findVisibleClient(
      this.clients,
      this.advisorAccess,
      input.actor,
      input.clientId,
    );

    return this.contacts.findByClient(input.clientId);
  }
}
