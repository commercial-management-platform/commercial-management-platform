import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import { Client, type ClientProps } from '../../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import { Contact } from '../../domain/entities/contact.js';
import type { ContactRepository } from '../../domain/repositories/contact.repository.js';
import { ListClientContactsUseCase } from './list-client-contacts.use-case.js';

describe('ListClientContactsUseCase', () => {
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
    id: 1,
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
      findById: vi.fn().mockResolvedValue(null),
      findByIdForClient: vi.fn().mockResolvedValue(null),
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

  it('lists the contacts of the client', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new ListClientContactsUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
    );

    const result = await useCase.execute({ actor, clientId: 7 });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('María Fernanda Gómez');
    expect(contacts.findByClient).toHaveBeenCalledWith(7);
  });

  it('throws NotFoundError when the client does not exist', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new ListClientContactsUseCase(
      createClientRepositoryFixture({
        findById: vi.fn().mockResolvedValue(null),
      }),
      contacts,
      createAdvisorAccessFixture(),
    );

    await expect(useCase.execute({ actor, clientId: 999 })).rejects.toThrow(
      NotFoundError,
    );
    expect(contacts.findByClient).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the advisor cannot reach the client', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new ListClientContactsUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(false),
    );

    await expect(
      useCase.execute({
        actor: { id: 'usr_advisor_1', role: UserRole.Advisor },
        clientId: 7,
      }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.findByClient).not.toHaveBeenCalled();
  });
});
