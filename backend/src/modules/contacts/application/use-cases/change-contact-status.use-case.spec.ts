import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../../auth/domain/types/user-role.enum.js';
import { NotFoundError } from '../../../../shared/domain/errors/index.js';
import type { AdvisorClientAccessPort } from '../../../clients/application/ports/advisor-client-access.port.js';
import type { ActivityLogPort } from '../../../clients/application/ports/activity-log.port.js';
import { Client, type ClientProps } from '../../../clients/domain/entities/client.js';
import type { ClientRepository } from '../../../clients/domain/repositories/client.repository.js';
import { Contact } from '../../domain/entities/contact.js';
import type { ContactRepository } from '../../domain/repositories/contact.repository.js';
import { ChangeContactStatusUseCase } from './change-contact-status.use-case.js';

describe('ChangeContactStatusUseCase', () => {
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
          async (id: number, data: { active?: boolean; isPrimary?: boolean }) =>
            new Contact({
              ...contactProps,
              ...data,
              id,
              updatedAt: new Date('2026-01-02T00:00:00Z'),
            }),
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

  it('deactivates the contact and registers the status change', async () => {
    const contacts = createContactRepositoryFixture();
    const activityLog = createActivityLogFixture();
    const useCase = new ChangeContactStatusUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    const result = await useCase.execute({
      actor,
      clientId: 7,
      contactId: 3,
      active: false,
    });

    expect(result.active).toBe(false);
    // Only the active flag changes: the contact is never deleted.
    expect(contacts.update).toHaveBeenCalledWith(3, { active: false });
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'contact.status_changed',
        userId: 'usr_admin_1',
        clientId: 7,
        description: expect.stringContaining('deactivated'),
      }),
    );
  });

  it('reactivates a deactivated contact', async () => {
    const contacts = createContactRepositoryFixture({
      findByIdForClient: vi
        .fn()
        .mockResolvedValue(new Contact({ ...contactProps, active: false })),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new ChangeContactStatusUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    const result = await useCase.execute({
      actor,
      clientId: 7,
      contactId: 3,
      active: true,
    });

    expect(result.active).toBe(true);
    expect(contacts.update).toHaveBeenCalledWith(3, { active: true });
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'contact.status_changed',
        description: expect.stringContaining('activated'),
      }),
    );
  });

  it('clears the primary flag when the primary contact is deactivated', async () => {
    const contacts = createContactRepositoryFixture({
      findByIdForClient: vi
        .fn()
        .mockResolvedValue(new Contact({ ...contactProps, isPrimary: true })),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new ChangeContactStatusUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    const result = await useCase.execute({
      actor,
      clientId: 7,
      contactId: 3,
      active: false,
    });

    expect(result.active).toBe(false);
    expect(result.isPrimary).toBe(false);
    expect(contacts.update).toHaveBeenCalledWith(3, {
      active: false,
      isPrimary: false,
    });
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.status_changed' }),
    );
    expect(activityLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.primary_changed' }),
    );
  });

  it('throws NotFoundError when the contact does not exist', async () => {
    const contacts = createContactRepositoryFixture({
      findByIdForClient: vi.fn().mockResolvedValue(null),
    });
    const activityLog = createActivityLogFixture();
    const useCase = new ChangeContactStatusUseCase(
      createClientRepositoryFixture(),
      contacts,
      createAdvisorAccessFixture(),
      activityLog,
    );

    await expect(
      useCase.execute({ actor, clientId: 7, contactId: 999, active: false }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.update).not.toHaveBeenCalled();
    expect(activityLog.record).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the advisor cannot reach the client', async () => {
    const contacts = createContactRepositoryFixture();
    const useCase = new ChangeContactStatusUseCase(
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
        active: false,
      }),
    ).rejects.toThrow(NotFoundError);
    expect(contacts.update).not.toHaveBeenCalled();
  });
});
