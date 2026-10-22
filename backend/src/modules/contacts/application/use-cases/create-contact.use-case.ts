import { Contact } from '../../domain/entities/contact.js';
import type { ContactRepository } from '../../domain/repositories/contact.repository.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import { findVisibleClient } from '../client-visibility.js';
import {
  normalizeEmail,
  normalizeJobTitle,
  normalizeName,
  normalizePhone,
} from '../contact-validation.js';
import type { ContactActor } from '../types/contact-actor.js';

export interface CreateContactInput {
  actor: ContactActor;
  /** Client the contact belongs to. Taken from the route, never from the body. */
  clientId: number;
  name: string;
  jobTitle?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  /** Marks the contact as the main one of the client. */
  isPrimary?: boolean;
}

/**
 * Creates a contact of an existing client.
 *
 * The client must exist and, for an advisor, be on one of their routes. When
 * the contact is created as the primary one, the repository demotes the
 * previous primary contact of the client in the same transaction.
 */
export class CreateContactUseCase {
  constructor(
    private readonly clients: ClientRepository,
    private readonly contacts: ContactRepository,
    private readonly advisorAccess: AdvisorClientAccessPort,
    private readonly activityLog: ActivityLogPort,
  ) {}

  async execute(input: CreateContactInput): Promise<Contact> {
    await findVisibleClient(
      this.clients,
      this.advisorAccess,
      input.actor,
      input.clientId,
    );

    const contact = await this.contacts.save(
      new Contact({
        id: null,
        clientId: input.clientId,
        name: normalizeName(input.name),
        jobTitle: normalizeJobTitle(input.jobTitle),
        phone: normalizePhone(input.phone, 'phone'),
        mobile: normalizePhone(input.mobile, 'mobile'),
        email: normalizeEmail(input.email),
        isPrimary: input.isPrimary === true,
        active: true,
        createdAt: null,
        updatedAt: null,
      }),
    );

    await this.activityLog.record({
      action: 'contact.created',
      userId: input.actor.id,
      clientId: input.clientId,
      description: `Contact '${contact.name}' created for client ${input.clientId}`,
      occurredAt: new Date(),
    });

    return contact;
  }
}
