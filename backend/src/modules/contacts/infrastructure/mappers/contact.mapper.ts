import { Contact } from '../../domain/entities/contact.js';
import { ContactOrmEntity } from '../persistence/entities/contact.orm-entity.js';

export class ContactMapper {
  static toDomain(entity: ContactOrmEntity): Contact {
    return new Contact({
      id: entity.id,
      clientId: entity.clientId,
      name: entity.name,
      jobTitle: entity.jobTitle,
      phone: entity.phone,
      mobile: entity.mobile,
      email: entity.email,
      isPrimary: entity.isPrimary,
      active: entity.active,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toPersistence(contact: Contact): ContactOrmEntity {
    const entity = new ContactOrmEntity();

    // A new contact has no id yet; the database generates it on insert.
    if (contact.id !== null) {
      entity.id = contact.id;
    }
    entity.clientId = contact.clientId;
    entity.name = contact.name;
    entity.jobTitle = contact.jobTitle;
    entity.phone = contact.phone;
    entity.mobile = contact.mobile;
    entity.email = contact.email;
    entity.isPrimary = contact.isPrimary;
    entity.active = contact.active;

    return entity;
  }
}
