import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ACTIVITY_LOG,
  type ActivityLogPort,
} from '../clients/application/ports/activity-log.port.js';
import {
  ADVISOR_CLIENT_ACCESS,
  type AdvisorClientAccessPort,
} from '../clients/application/ports/advisor-client-access.port.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../clients/domain/repositories/client.repository.js';
import { ClientsModule } from '../clients/clients.module.js';
import { ChangeContactStatusUseCase } from './application/use-cases/change-contact-status.use-case.js';
import { CreateContactUseCase } from './application/use-cases/create-contact.use-case.js';
import { GetContactUseCase } from './application/use-cases/get-contact.use-case.js';
import { ListClientContactsUseCase } from './application/use-cases/list-client-contacts.use-case.js';
import { UpdateContactUseCase } from './application/use-cases/update-contact.use-case.js';
import {
  CONTACT_REPOSITORY,
  type ContactRepository,
} from './domain/repositories/contact.repository.js';
import { ContactOrmEntity } from './infrastructure/persistence/entities/contact.orm-entity.js';
import { TypeOrmContactRepository } from './infrastructure/repositories/typeorm-contact.repository.js';
import { ContactsController } from './presentation/contacts.controller.js';

/**
 * Composition root of the contacts module (HU-04). It is the only file that
 * knows every layer.
 *
 * The client repository, the advisor visibility and the activity log come
 * from the clients module (HU-03): a contact always belongs to a client.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ContactOrmEntity]), ClientsModule],
  controllers: [ContactsController],
  providers: [
    { provide: CONTACT_REPOSITORY, useClass: TypeOrmContactRepository },
    {
      provide: CreateContactUseCase,
      inject: [
        CLIENT_REPOSITORY,
        CONTACT_REPOSITORY,
        ADVISOR_CLIENT_ACCESS,
        ACTIVITY_LOG,
      ],
      useFactory: (
        clients: ClientRepository,
        contacts: ContactRepository,
        advisorAccess: AdvisorClientAccessPort,
        activityLog: ActivityLogPort,
      ) =>
        new CreateContactUseCase(clients, contacts, advisorAccess, activityLog),
    },
    {
      provide: ListClientContactsUseCase,
      inject: [CLIENT_REPOSITORY, CONTACT_REPOSITORY, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        clients: ClientRepository,
        contacts: ContactRepository,
        advisorAccess: AdvisorClientAccessPort,
      ) =>
        new ListClientContactsUseCase(clients, contacts, advisorAccess),
    },
    {
      provide: GetContactUseCase,
      inject: [CLIENT_REPOSITORY, CONTACT_REPOSITORY, ADVISOR_CLIENT_ACCESS],
      useFactory: (
        clients: ClientRepository,
        contacts: ContactRepository,
        advisorAccess: AdvisorClientAccessPort,
      ) => new GetContactUseCase(clients, contacts, advisorAccess),
    },
    {
      provide: UpdateContactUseCase,
      inject: [
        CLIENT_REPOSITORY,
        CONTACT_REPOSITORY,
        ADVISOR_CLIENT_ACCESS,
        ACTIVITY_LOG,
      ],
      useFactory: (
        clients: ClientRepository,
        contacts: ContactRepository,
        advisorAccess: AdvisorClientAccessPort,
        activityLog: ActivityLogPort,
      ) =>
        new UpdateContactUseCase(clients, contacts, advisorAccess, activityLog),
    },
    {
      provide: ChangeContactStatusUseCase,
      inject: [
        CLIENT_REPOSITORY,
        CONTACT_REPOSITORY,
        ADVISOR_CLIENT_ACCESS,
        ACTIVITY_LOG,
      ],
      useFactory: (
        clients: ClientRepository,
        contacts: ContactRepository,
        advisorAccess: AdvisorClientAccessPort,
        activityLog: ActivityLogPort,
      ) =>
        new ChangeContactStatusUseCase(
          clients,
          contacts,
          advisorAccess,
          activityLog,
        ),
    },
  ],
  exports: [
    CONTACT_REPOSITORY,
    CreateContactUseCase,
    ListClientContactsUseCase,
    GetContactUseCase,
    UpdateContactUseCase,
    ChangeContactStatusUseCase,
  ],
})
export class ContactsModule {}
