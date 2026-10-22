import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import { Client, type ClientProps } from '../../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import { Contact } from '../../domain/entities/contact.js';
import type { ContactRepository } from '../../domain/repositories/contact.repository.js';
import { GetContactUseCase } from './get-contact.use-case.js';

describe('GetContactUseCase', () => {
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

  const contact = new Contact({
    id: 3,
    clientId: 7,
    name: 'María Fernanda Gómez',
    jobTitle: 'Gerente de Compras',
    phone: '6015551234',
    mobile: null,
    email: 'compras@distribuidoraandina.co',
    isPrimary: true,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

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
      findByClient: vi.fn().mockResolvedValue([contact]),
      findById: vi.fn().mockResolvedValue(contact),
      findByIdForClient: vi.fn().mockResolvedValue(contact),
      save: vi.fn(),
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

  it('returns the contact of the client', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new GetContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
    );

    const result = await useCase.execute({ actor, clientId: 7, contactId: 3 });

    expect(result.id).toBe(3);
    expect(result.clientId).toBe(7);
    expect(contacts.findByIdForClient).toHaveBeenCalledWith(7, 3);
  });

  it('throws NotFoundError when the contact does not exist', async () => {
    const contacts = createContactRepositoryFixture({
      findByIdForClient: vi.fn().mockResolvedValue(null),
    });
    const useCase = new GetContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
    );

    await expect(
      useCase.execute({ actor, clientId: 7, contactId: 999 }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when the contact belongs to another client', async () => {
    // The repository only returns the contact when it belongs to the client
    // of the route, so a contact of another client answers as not found.
    const contacts = createContactRepositoryFixture({
      findByIdForClient: vi.fn().mockResolvedValue(null),
    });
    const useCase = new GetContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
    );

    await expect(
      useCase.execute({ actor, clientId: 7, contactId: 1 }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when the client does not exist', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new GetContactUseCase(
      createClientRepositoryFixture({
        findById: vi.fn().mockResolvedValue(null),
      }),
      contacts,
      createAdvisorAccessFixture(),
    );

    await expect(
      useCase.execute({ actor, clientId: 999, contactId: 3 }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.findByIdForClient).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the advisor cannot reach the client', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new GetContactUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(false),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
        clientId: 7,
        contactId: 3,
      }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.findByIdForClient).not.toHaveBeenCalled();
  });
});
