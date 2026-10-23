import { describe, expect, it, vi } from 'vitest';
import { QueryFailedError, Repository } from 'typeorm';

import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/domain/errors/index.js';
import { ClientPortfolioOrmEntity } from '../persistence/entities/client-portfolio.orm-entity.js';
import { TypeOrmClientPortfolioRepository } from './typeorm-client-portfolio.repository.js';

/**
 * The repository owns the "one association per client and portfolio" rule, so
 * these tests check that the database error of the unique index becomes a
 * conflict and that the removal only deletes the association.
 */
describe('TypeOrmClientPortfolioRepository', () => {
  function createRepositoryFixture(): {
    repository: Repository<ClientPortfolioOrmEntity>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  } {
    const find = vi.fn().mockResolvedValue([]);
    const findOne = vi.fn().mockResolvedValue(null);
    const save = vi.fn().mockImplementation(
      async (entity: ClientPortfolioOrmEntity) => {
        entity.id = entity.id ?? 1;
        return entity;
      },
    );
    const deleteMock = vi.fn().mockResolvedValue({ affected: 1 });

    const repository = {
      find,
      findOne,
      save,
      delete: deleteMock,
    } as unknown as Repository<ClientPortfolioOrmEntity>;

    return { repository, find, findOne, save, delete: deleteMock };
  }

  it('returns the associations of a portfolio', async () => {
    const { repository, find } = createRepositoryFixture();
    const entity = new ClientPortfolioOrmEntity();
    entity.id = 1;
    entity.portfolioId = 3;
    entity.clientId = 7;
    find.mockResolvedValue([entity]);

    const clientPortfolioRepository = new TypeOrmClientPortfolioRepository(
      repository,
    );
    const result = await clientPortfolioRepository.findByPortfolio(3);

    expect(find).toHaveBeenCalledWith({
      where: { portfolioId: 3 },
      order: { id: 'ASC' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].portfolioId).toBe(3);
    expect(result[0].clientId).toBe(7);
  });

  it('returns null when the client is not associated to the portfolio', async () => {
    const { repository, findOne } = createRepositoryFixture();
    findOne.mockResolvedValue(null);

    const clientPortfolioRepository = new TypeOrmClientPortfolioRepository(
      repository,
    );

    await expect(
      clientPortfolioRepository.findAssociation(3, 7),
    ).resolves.toBeNull();
  });

  it('creates the association', async () => {
    const { repository, save } = createRepositoryFixture();

    const clientPortfolioRepository = new TypeOrmClientPortfolioRepository(
      repository,
    );
    const result = await clientPortfolioRepository.associate(3, 7);

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ portfolioId: 3, clientId: 7 }),
    );
    expect(result.id).toBe(1);
    expect(result.portfolioId).toBe(3);
    expect(result.clientId).toBe(7);
  });

  it('translates the unique violation into a ConflictError', async () => {
    const { repository, save } = createRepositoryFixture();
    save.mockRejectedValueOnce(
      new QueryFailedError('INSERT INTO client_portfolio', [], {
        code: '23505',
        constraint: 'uq_client_portfolio_portfolio_client',
      }),
    );

    const clientPortfolioRepository = new TypeOrmClientPortfolioRepository(
      repository,
    );

    await expect(
      clientPortfolioRepository.associate(3, 7),
    ).rejects.toThrow(ConflictError);
  });

  it('keeps any other database error untouched', async () => {
    const { repository, save } = createRepositoryFixture();
    const failure = new QueryFailedError('INSERT INTO client_portfolio', [], {
      code: '23503',
      constraint: 'FK_client_portfolio_client_id',
    });
    save.mockRejectedValueOnce(failure);

    const clientPortfolioRepository = new TypeOrmClientPortfolioRepository(
      repository,
    );

    await expect(clientPortfolioRepository.associate(3, 7)).rejects.toThrow(
      failure,
    );
  });

  it('deletes only the association of the portfolio and the client', async () => {
    const { repository, delete: deleteMock } = createRepositoryFixture();

    const clientPortfolioRepository = new TypeOrmClientPortfolioRepository(
      repository,
    );
    await clientPortfolioRepository.removeAssociation(3, 7);

    expect(deleteMock).toHaveBeenCalledWith({ portfolioId: 3, clientId: 7 });
  });

  it('throws NotFoundError when the association does not exist', async () => {
    const { repository, delete: deleteMock } = createRepositoryFixture();
    deleteMock.mockResolvedValue({ affected: 0 });

    const clientPortfolioRepository = new TypeOrmClientPortfolioRepository(
      repository,
    );

    await expect(
      clientPortfolioRepository.removeAssociation(3, 7),
    ).rejects.toThrow(NotFoundError);
  });
});
