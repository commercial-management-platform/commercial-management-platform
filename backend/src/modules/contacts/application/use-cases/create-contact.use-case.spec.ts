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
import type { ContactRepository } from '../../domain/repositories/contact.repository.js';
import { CreateContactUseCase } from './create-contact.use-case.js';

describe('CreateContactUseCase', () => {
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
      findById: vi.fn().mockResolvedValue(null),
      findByIdForClient: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockImplementation(
        async (contact: Contact) =>
          new Contact({
            ...contact,
            id: 1,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          }),
      ),
      update: vi.fn(),
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

  it('creates an active contact of the client and registers the activity log', async () => {
    const contacts = createContactRepositoryFixture();
    const activityLog = createActivityLogFixture();
    const useCase = new CreateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    const contact = await useCase.execute({
      actor,
      clientId: 7,
      name: '  María Fernanda Gómez  ',
      jobTitle: '  Gerente de Compras  ',
      phone: '6015551234',
      mobile: '3105551234',
      email: '  Compras@DistribuidoraAndina.co ',
    });

    expect(contact.id).toBe(1);
    expect(contact.clientId).toBe(7);
    expect(contact.name).toBe('María Fernanda Gómez');
    expect(contact.jobTitle).toBe('Gerente de Compras');
    expect(contact.email).toBe('compras@distribuidoraandina.co');
    expect(contact.isPrimary).toBe(false);
    expect(contact.active).toBe(true);
    expect(contacts.save).toHaveBeenCalledTimes(1);
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'contact.created',
        userId: 'usr_admin_1',
        clientId: 7,
      }),
    );
  });

  it('creates the contact as primary when it is requested', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new CreateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      createActivityLogFixture(),
    );

    const contact = await useCase.execute({
      actor,
      clientId: 7,
      name: 'María Fernanda Gómez',
      email: 'compras@distribuidoraandina.co',
      isPrimary: true,
    });

    expect(contact.isPrimary).toBe(true);
    expect(contacts.save).toHaveBeenCalledWith(
      expect.objectContaining({ isPrimary: true, clientId: 7 }),
    );
  });

  it('throws NotFoundError when the client does not exist', async () => {
    const contacts = createContactRepositoryFixture();
    const activityLog = createActivityLogFixture();
    const useCase = new CreateContactUseCase(
      createClientRepositoryFixture({
        findById: vi.fn().mockResolvedValue(null),
      }),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    await expect(
      useCase.execute({ actor, clientId: 999, name: 'María Fernanda Gómez' }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.save).not.toHaveBeenCalled();
    expect(activityLog.record).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the advisor cannot reach the client', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new CreateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(false),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
        clientId: 7,
        name: 'María Fernanda Gómez',
      }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.save).not.toHaveBeenCalled();
  });

  it('throws ValidationError when the name is missing', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new CreateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({ actor, clientId: 7, name: '   ' }),
    ).rejects.toThrow(ValidationError);
    expect(contacts.save).not.toHaveBeenCalled();
  });

  it('throws ValidationError when no contact method is given', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new CreateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor,
        clientId: 7,
        name: 'María Fernanda Gómez',
        phone: '  ',
        email: null,
      }),
    ).rejects.toThrow(ValidationError);
    expect(contacts.save).not.toHaveBeenCalled();
  });

  it('creates the contact with a single contact method', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new CreateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      createActivityLogFixture(),
    );

    await useCase.execute({
      actor,
      clientId: 7,
      name: 'María Fernanda Gómez',
      mobile: '3105551234',
    });

    expect(contacts.save).toHaveBeenCalledWith(
      expect.objectContaining({ mobile: '3105551234', phone: null, email: null }),
    );
  });

  it('throws ValidationError for an invalid email or phone', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new CreateContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      createActivityLogFixture(),
    );

    await expect(
      useCase.execute({
        actor,
        clientId: 7,
        name: 'María Fernanda Gómez',
        email: 'not-an-email',
      }),
    ).rejects.toThrow(ValidationError);
    await expect(
      useCase.execute({
        actor,
        clientId: 7,
        name: 'María Fernanda Gómez',
        phone: 'abc',
      }),
    ).rejects.toThrow(ValidationError);
    expect(contacts.save).not.toHaveBeenCalled();
  });
});
