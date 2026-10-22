import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import { Client, type ClientProps } from '../../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import { Contact } from '../../domain/entities/contact.js';
import type {
  ContactRepository,
  UpdateContactData,
} from '../../domain/repositories/contact.repository.js';
import { UpdateContactUseCase } from './update-contact.use-case.js';

describe('UpdateContactUseCase', () => {
  const actor = { id: 'usr_admin_1', role: UserRole.Admin };

  const clientProps: ClientProps = {
    id: 7,
    nit: '900123456-5',
    businessName: 'Distribuidora Andina SAS',
    tradeName: null,
    address: null,
    department: null,
    municipality: null,
    neighborhood: null,
    phone: null,
    email: null,
    zoneId: null,
    clientTypeId: null,
    clientPotentialId: null,
    clientStatusId: null,
    visitFrequencyDays: null,
    latitude: null,
    longitude: null,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const contactProps = {
    id: 3,
    clientId: 7,
    name: 'María Fernanda Gómez',
    jobTitle: 'Gerente de Compras',
    phone: '6015551234',
    mobile: null,
    email: 'compras@distribuidoraandina.co',
    isPrimary: false,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  function createClientRepositoryFixture(
    overrides: Partial<ClientRepository> = {},
  ): ClientRepository {
    return {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(new Client(clientProps)),
      findByNit: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      ...overrides,
    };
  }

  function createContactRepositoryFixture(
    overrides: Partial<ContactRepository> = {},
  ): ContactRepository {
    return {
      findByClient: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(new Contact(contactProps)),
      findByIdForClient: vi.fn().mockResolvedValue(new Contact(contactProps)),
      save: vi.fn(),
      update: vi
        .fn()
        .mockImplementation(
          async (id: number, data: UpdateContactData) =>
            new Contact({ ...contactProps, ...data, id }),
        ),
      ...overrides,
    };
  }

  function createAdvisorAccessFixture(
    canAccess = true,
  ): AdvisorClientAccessPort {
    return {
      canAccess: vi.fn().mockResolvedValue(canAccess),
      getAccessibleClientIds: vi.fn().mockResolvedValue([7]),
    };
  }

  function createActivityLogFixture(): ActivityLogPort {
    return { record: vi.fn().mockResolvedValue(undefined) };
  }

  it('updates the allowed fields and registers the activity log', async () => {
    const contacts = createContactRepositoryFixture();
    const activityLog = createActivityLogFixture();
    const useCase = new UpdateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    const result = await useCase.execute({
      actor,
      clientId: 7,
      contactId: 3,
      data: {
        name: '  María Fernanda Gómez  ',
        jobTitle: 'Directora de Compras',
        phone: '6019998888',
        email: 'Compras@DistribuidoraAndina.co',
      },
    });

    expect(result.name).toBe('María Fernanda Gómez');
    expect(result.jobTitle).toBe('Directora de Compras');
    expect(result.email).toBe('compras@distribuidoraandina.co');
    expect(contacts.update).toHaveBeenCalledWith(3, {
      name: 'María Fernanda Gómez',
      jobTitle: 'Directora de Compras',
      phone: '6019998888',
      email: 'compras@distribuidoraandina.co',
    });
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'contact.updated',
        userId: 'usr_admin_1',
        clientId: 7,
      }),
    );
  });

  it('does not overwrite the stored fields that were not sent', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new UpdateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor,
      clientId: 7,
      contactId: 3,
      data: { name: 'María Gómez', phone: undefined, email: undefined },
    });

    expect(contacts.update).toHaveBeenCalledWith(3, { name: 'María Gómez' });
  });

  it('registers the primary change when the contact is promoted', async () => {
    const contacts = createContactRepositoryFixture();
    const activityLog = createActivityLogFixture();
    const useCase = new UpdateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    await useCase.execute({
      actor,
      clientId: 7,
      contactId: 3,
      data: { isPrimary: true },
    });

    expect(contacts.update).toHaveBeenCalledWith(3, { isPrimary: true });
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.updated' }),
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.primary_changed' }),
    );
  });

  it('does not register a primary change when the contact keeps the flag', async () => {
    const contacts = createContactRepositoryFixture({
      findByIdForClient: vi
        .fn()
        .mockResolvedValue(new Contact({ ...contactProps, isPrimary: true })),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new UpdateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    await useCase.execute({
      actor,
      clientId: 7,
      contactId: 3,
      data: { isPrimary: true },
    });

    expect(activityLog.record).toHaveBeenCalledTimes(1);
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.updated' }),
    );
  });

  it('throws NotFoundError when the contact does not belong to the client', async () => {
    const contacts = createContactRepositoryFixture({
      findByIdForClient: vi.fn().mockResolvedValue(null),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new UpdateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    await expect(
      useCase.execute({
        actor,
        clientId: 7,
        contactId: 999,
        data: { name: 'María Gómez' },
      }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.update).not.toHaveBeenCalled();
    expect(activityLog.record).not.toHaveBeenCalled();
  });

  it('throws ValidationError for an invalid email', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new UpdateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor,
        clientId: 7,
        contactId: 3,
        data: { email: 'not-an-email' },
      }),
    ).rejects.toThrow(ValidationError);
    expect(contacts.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the advisor cannot reach the client', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new UpdateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(false),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
        clientId: 7,
        contactId: 3,
        data: { name: 'María Gómez' },
      }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.update).not.toHaveBeenCalled();
  });
});
