import type { Contact } from '../entities/contact.js';

export const CONTACT_REPOSITORY = Symbol('CONTACT_REPOSITORY');

export interface UpdateContactData {
  name?: string;
  jobTitle?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  isPrimary?: boolean;
  active?: boolean;
}

export interface ContactRepository {
  /** Contacts of a client, the primary one first. */
  findByClient(clientId: number): Promise<Contact[]>;
  findById(id: number): Promise<Contact | null>;
  /** A contact only when it belongs to the given client. */
  findByIdForClient(clientId: number, id: number): Promise<Contact | null>;
  save(contact: Contact): Promise<Contact>;
  /**
   * Partial update. When `isPrimary` is true, the previous primary contact of
   * the client is demoted in the same transaction, so a client never has two
   * primary contacts.
   */
  update(id: number, data: UpdateContactData): Promise<Contact>;
}
