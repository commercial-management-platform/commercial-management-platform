import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { Contact } from '../../domain/entities/contact.js';
import type {
  ContactRepository,
  UpdateContactData,
} from '../../domain/repositories/contact.repository.js';
import { findVisibleClient } from '../client-visibility.js';
import {
  normalizeEmail,
  normalizeJobTitle,
  normalizeName,
  normalizePhone,
} from '../contact-validation.js';
import type { ContactActor } from '../types/contact-actor.js';

export interface UpdateContactInput {
  actor: ContactActor;
  clientId: number;
  contactId: number;
  data: UpdateContactData;
}

/**
 * Updates the allowed fields of a contact.
 *
 * `isPrimary` promotes the contact: the repository demotes the previous
 * primary contact of the client in the same transaction. The contact is never
 * deleted, only deactivated through the status operation.
 */
export class UpdateContactUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly contacts: ContactRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: UpdateContactInput): Promise<Contact> {
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

    // The transport may deliver every decorated field as an own property,
    // with an explicit undefined when it was not sent. Undefined means
    // "not provided" and must never overwrite the stored value.
    const data: UpdateContactData = { ...input.data };
    for (const key of Object.keys(data) as (keyof UpdateContactData)[]) {
      if (data[key] === undefined) {
        delete data[key];
      }
    }

    if (data.name !== undefined) {
      data.name = normalizeName(data.name);
    }
    if (data.jobTitle !== undefined) {
      data.jobTitle = normalizeJobTitle(data.jobTitle);
    }
    if (data.phone !== undefined) {
      data.phone = normalizePhone(data.phone, 'phone');
    }
    if (data.mobile !== undefined) {
      data.mobile = normalizePhone(data.mobile, 'mobile');
    }
    if (data.email !== undefined) {
      data.email = normalizeEmail(data.email);
    }

    // Promoting or demoting a contact changes the main contact of the
    // client, which is tracked apart from the plain update.
    const primaryChanged =
      data.isPrimary !== undefined && data.isPrimary !== contact.isPrimary;

    const updated = await this.contacts.update(input.contactId, data);

    await this.activityLog.record({
      action: 'contact.updated',
      userId: input.actor.id,
      clientId: input.clientId,
      description: `Contact '${updated.name}' updated`,
      occurredAt: new Date(),
    });

    if (primaryChanged) {
      await this.activityLog.record({
        action: 'contact.primary_changed',
        userId: input.actor.id,
        clientId: input.clientId,
        description: `Contact '${updated.name}' is now the primary contact of client ${input.clientId}`,
        occurredAt: new Date(),
      });
    }

    return updated;
  }
}
