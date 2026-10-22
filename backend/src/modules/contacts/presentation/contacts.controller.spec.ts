import { describe, expect, it, vi } from 'vitest';
import { AuthUser } from '../../auth/domain/entities/auth-user.entity.js';
import { UserRole } from '../../auth/domain/types/user-role.enum.js';
import { ChangeContactStatusUseCase } from '../application/use-cases/change-contact-status.use-case.js';
import { CreateContactUseCase } from '../application/use-cases/create-contact.use-case.js';
import { GetContactUseCase } from '../application/use-cases/get-contact.use-case.js';
import { ListClientContactsUseCase } from '../application/use-cases/list-client-contacts.use-case.js';
import { UpdateContactUseCase } from '../application/use-cases/update-contact.use-case.js';
import { Contact } from '../domain/entities/contact.js';
import { ContactsController } from './contacts.controller.js';
import type { CreateContactDto } from './dtos/create-contact.dto.js';
import type { UpdateContactDto } from './dtos/update-contact.dto.js';

describe('ContactsController', () => {
  const adminUser = new AuthUser({
    id: 'usr_admin_1',
    email: 'admin@cmp.com',
    name: 'Admin User',
    role: UserRole.Admin,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

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

  function createController() {
    const create = { execute: vi.fn().mockResolvedValue(contact) };
    const list = { execute: vi.fn().mockResolvedValue([contact]) };
    const get = { execute: vi.fn().mockResolvedValue(contact) };
    const update = { execute: vi.fn().mockResolvedValue(contact) };
    const status = { execute: vi.fn().mockResolvedValue(contact) };

    const controller = new ContactsController(
      create as unknown as CreateContactUseCase,
      list as unknown as ListClientContactsUseCase,
      get as unknown as GetContactUseCase,
      update as unknown as UpdateContactUseCase,
      status as unknown as ChangeContactStatusUseCase,
    );

    return { controller, create, list, get, update, status };
  }

  it('create forwards the actor, the client of the route and the dto', async () => {
    const { controller, create } = createController();
    const dto = {
      name: 'María Fernanda Gómez',
      jobTitle: 'Gerente de Compras',
      phone: '6015551234',
      mobile: '3105551234',
      email: 'compras@distribuidoraandina.co',
      isPrimary: true,
    } as CreateContactDto;

    const result = await controller.create(7, dto, adminUser);

    expect(create.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      name: 'María Fernanda Gómez',
      jobTitle: 'Gerente de Compras',
      phone: '6015551234',
      mobile: '3105551234',
      email: 'compras@distribuidoraandina.co',
      isPrimary: true,
    });
    expect(result.id).toBe(1);
    expect(result.clientId).toBe(7);
    expect(result.isPrimary).toBe(true);
    expect(result.active).toBe(true);
  });

  it('list maps every contact to a contact response', async () => {
    const { controller, list } = createController();

    const result = await controller.list(7, adminUser);

    expect(list.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('María Fernanda Gómez');
  });

  it('getById passes the client, the contact id and the actor', async () => {
    const { controller, get } = createController();

    const result = await controller.getById(7, 1, adminUser);

    expect(get.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      contactId: 1,
    });
    expect(result.id).toBe(1);
  });

  it('update passes the actor, the ids and the data', async () => {
    const { controller, update } = createController();
    const dto = { phone: '6015551234', isPrimary: true } as UpdateContactDto;

    await controller.update(7, 1, dto, adminUser);

    expect(update.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      contactId: 1,
      data: { phone: '6015551234', isPrimary: true },
    });
  });

  it('changeStatus passes the active flag and the actor', async () => {
    const { controller, status } = createController();

    const result = await controller.changeStatus(
      7,
      1,
      { active: false },
      adminUser,
    );

    expect(status.execute).toHaveBeenCalledWith({
      actor: { id: 'usr_admin_1', role: UserRole.Admin },
      clientId: 7,
      contactId: 1,
      active: false,
    });
    expect(result.active).toBe(true);
  });
});
