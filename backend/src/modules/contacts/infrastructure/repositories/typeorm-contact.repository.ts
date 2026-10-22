import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';

import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/domain/errors/index.js';
import { Contact } from '../../domain/entities/contact.js';
import type {
  ContactRepository,
  UpdateContactData,
} from '../../domain/repositories/contact.repository.js';
import { ContactMapper } from '../mappers/contact.mapper.js';
import { ContactOrmEntity } from '../persistence/entities/contact.orm-entity.js';

interface PostgresDriverError {
  code?: string;
}

/**
 * TypeORM repository of the contacts.
 *
 * The repository owns the "one primary contact per client" rule: when a
 * contact is stored as primary, the previous primary contact of the client is
 * demoted in the same transaction. The partial unique index
 * `uq_contact_one_primary_per_client` is the last guarantee against a race
 * between two concurrent requests.
 */
@Injectable()
export class TypeOrmContactRepository implements ContactRepository {
  constructor(
    @InjectRepository(ContactOrmEntity)
    private readonly repository: Repository<ContactOrmEntity>,
  ) {}

  async findByClient(clientId: number): Promise<Contact[]> {
    const entities = await this.repository.find({
      where: { clientId },
      order: { isPrimary: 'DESC', name: 'ASC' },
    });

    return entities.map((entity) => ContactMapper.toDomain(entity));
  }

  async findById(id: number): Promise<Contact | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ContactMapper.toDomain(entity) : null;
  }

  async findByIdForClient(
    clientId: number,
    id: number,
  ): Promise<Contact | null> {
    const entity = await this.repository.findOne({ where: { id, clientId } });
    return entity ? ContactMapper.toDomain(entity) : null;
  }

  async save(contact: Contact): Promise<Contact> {
    const entity = ContactMapper.toPersistence(contact);

    try {
      const saved = await this.repository.manager.transaction(
        async (manager: EntityManager) => {
          if (entity.isPrimary) {
            await this.demoteOtherPrimaries(manager, entity.clientId);
          }
          return manager.save(ContactOrmEntity, entity);
        },
      );

      return ContactMapper.toDomain(saved);
    } catch (error) {
      throw this.translatePrimaryViolation(error);
    }
  }

  async update(id: number, data: UpdateContactData): Promise<Contact> {
    try {
      const saved = await this.repository.manager.transaction(
        async (manager: EntityManager) => {
          // The read and the write happen in the same transaction, so a
          // concurrent change cannot be overwritten.
          const entity = await manager.findOne(ContactOrmEntity, {
            where: { id },
          });
          if (!entity) {
            throw new NotFoundError(`Contact with id '${id}' not found`);
          }

          if (data.name !== undefined) {
            entity.name = data.name;
          }
          if (data.jobTitle !== undefined) {
            entity.jobTitle = data.jobTitle;
          }
          if (data.phone !== undefined) {
            entity.phone = data.phone;
          }
          if (data.mobile !== undefined) {
            entity.mobile = data.mobile;
          }
          if (data.email !== undefined) {
            entity.email = data.email;
          }
          if (data.isPrimary !== undefined) {
            entity.isPrimary = data.isPrimary;
          }
          if (data.active !== undefined) {
            entity.active = data.active;
          }

          if (data.isPrimary === true) {
            // The contact itself is saved right after, so demoting it here is
            // harmless and keeps the rule in a single statement.
            await this.demoteOtherPrimaries(manager, entity.clientId);
          }

          return manager.save(ContactOrmEntity, entity);
        },
      );

      return ContactMapper.toDomain(saved);
    } catch (error) {
      throw this.translatePrimaryViolation(error);
    }
  }

  /**
   * Clears the primary flag of every contact of the client. The contact that
   * is being promoted is saved as primary right after, inside the same
   * transaction.
   */
  private async demoteOtherPrimaries(
    manager: EntityManager,
    clientId: number,
  ): Promise<void> {
    await manager.update(
      ContactOrmEntity,
      { clientId },
      { isPrimary: false },
    );
  }

  private translatePrimaryViolation(error: unknown): unknown {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as PostgresDriverError | undefined;
      if (driverError?.code === '23505') {
        return new ConflictError(
          'A client can only have one primary contact',
        );
      }
    }
    return error;
  }
}
