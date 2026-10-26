import { describe, expect, it, vi } from 'vitest';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';

import { ConflictError, NotFoundError } from '../../../../shared/domain/errors/index.js';
import { Contact } from '../../domain/entities/contact.js';
import { ContactOrmEntity } from '../persistence/entities/contact.orm-entity.js';
import { TypeOrmContactRepository } from './typeorm-contact.repository.js';

/**
 * The repository owns the "one primary contact per client" rule, so these
 * tests check that the demotion of the previous primary happens inside the
 * same transaction that stores the new primary.
 */
describe('TypeOrmContactRepository', () => {
  interface ManagerFixture {
    update: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  }

  function createRepositoryFixture(
    existing: ContactOrmEntity | null = null,
  ): {
    repository: Repository<ContactOrmEntity>;
    manager: ManagerFixture;
    findOne: ReturnType<typeof vi.fn>;
  } {
    const manager: ManagerFixture = {
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      save: vi.fn().mockImplementation(
        async (_target: unknown, entity: ContactOrmEntity) => {
          entity.id = entity.id ?? 1;
          return entity;
        },
      ),
      findOne: vi.fn().mockResolvedValue(existing),
    };

    const findOne = vi.fn().mockResolvedValue(existing);

    const repository = {
      find: vi.fn().mockResolvedValue([]),
      findOne,
      save: vi.fn(),
      manager: {
        transaction: vi
          .fn()
          .mockImplementation(async (work: (m: EntityManager) => Promise<unknown>) =>
            work(manager as unknown as EntityManager),
          ),
      },
    } as unknown as Repository<ContactOrmEntity>;

    return { repository, manager, findOne };
  }

  function buildContact(isPrimary: boolean): Contact {
    return new Contact({
      id: null,
      clientId: 7,
      name: 'María Fernanda Gómez',
      jobTitle: 'Gerente de Compras',
      phone: '6015551234',
      mobile: null,
      email: 'compras@distribuidoraandina.co',
      isPrimary,
      active: true,
      createdAt: null,
      updatedAt: null,
    });
  }

  it('demotes the previous primary contact in the same transaction of the insert', async () => {
    const { repository, manager } = createRepositoryFixture();
    const contactRepository = new TypeOrmContactRepository(repository);

    const saved = await contactRepository.save(buildContact(true));

    expect(manager.update).toHaveBeenCalledWith(
      ContactOrmEntity,
      { clientId: 7 },
      { isPrimary: false },
    );
    expect(manager.save).toHaveBeenCalledWith(
      ContactOrmEntity,
      expect.objectContaining({ clientId: 7, isPrimary: true }),
    );
    expect(saved.isPrimary).toBe(true);
    expect(saved.id).toBe(1);
  });

  it('does not demote any contact when the new contact is not primary', async () => {
    const { repository, manager } = createRepositoryFixture();
    const contactRepository = new TypeOrmContactRepository(repository);

    await contactRepository.save(buildContact(false));

    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(
      ContactOrmEntity,
      expect.objectContaining({ isPrimary: false }),
    );
  });

  it('demotes the previous primary contact in the same transaction of the update', async () => {
    const existing = new ContactOrmEntity();
    existing.id = 3;
    existing.clientId = 7;
    existing.name = 'María Fernanda Gómez';
    existing.jobTitle = null;
    existing.phone = null;
    existing.mobile = null;
    existing.email = null;
    existing.isPrimary = false;
    existing.active = true;

    const { repository, manager } = createRepositoryFixture(existing);
    const contactRepository = new TypeOrmContactRepository(repository);

    const updated = await contactRepository.update(3, { isPrimary: true });

    expect(manager.update).toHaveBeenCalledWith(
      ContactOrmEntity,
      { clientId: 7 },
      { isPrimary: false },
    );
    expect(manager.save).toHaveBeenCalledWith(
      ContactOrmEntity,
      expect.objectContaining({ id: 3, isPrimary: true }),
    );
    expect(updated.isPrimary).toBe(true);
  });

  it('does not demote any contact when the update does not touch the primary flag', async () => {
    const existing = new ContactOrmEntity();
    existing.id = 3;
    existing.clientId = 7;
    existing.name = 'María Fernanda Gómez';
    existing.jobTitle = null;
    existing.phone = null;
    existing.mobile = null;
    existing.email = null;
    existing.isPrimary = true;
    existing.active = true;

    const { repository, manager } = createRepositoryFixture(existing);
    const contactRepository = new TypeOrmContactRepository(repository);

    const updated = await contactRepository.update(3, { active: false });

    expect(manager.update).not.toHaveBeenCalled();
    expect(updated.active).toBe(false);
    expect(updated.isPrimary).toBe(true);
  });

  it('throws NotFoundError when the contact to update does not exist', async () => {
    const { repository } = createRepositoryFixture(null);
    const contactRepository = new TypeOrmContactRepository(repository);

    await expect(
      contactRepository.update(999, { name: 'María Gómez' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('translates the unique violation of the primary index into a ConflictError', async () => {
    const { repository, manager } = createRepositoryFixture();
    manager.save.mockRejectedValueOnce(
      new QueryFailedError('INSERT INTO contact', [], {
        code: '23505',
        constraint: 'uq_contact_one_primary_per_client',
      }),
    );
    const contactRepository = new TypeOrmContactRepository(repository);

    await expect(contactRepository.save(buildContact(true))).rejects.toThrow(
      ConflictError,
    );
  });

  it('keeps any other database error untouched', async () => {
    const { repository, manager } = createRepositoryFixture();
    const failure = new QueryFailedError('INSERT INTO contact', [], {
      code: '23502',
      constraint: 'contact_name_not_null',
    });
    manager.save.mockRejectedValueOnce(failure);
    const contactRepository = new TypeOrmContactRepository(repository);

    await expect(contactRepository.save(buildContact(false))).rejects.toThrow(
      failure,
    );
  });
});
