import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import {
  ConflictError,
  NotFoundError,
} from '../../../../shared/domain/errors/index.js';
import { ClientPortfolio } from '../../domain/entities/client-portfolio.js';
import type { ClientPortfolioRepository } from '../../domain/repositories/client-portfolio.repository.js';
import { ClientPortfolioMapper } from '../mappers/client-portfolio.mapper.js';
import { ClientPortfolioOrmEntity } from '../persistence/entities/client-portfolio.orm-entity.js';

interface PostgresDriverError {
  code?: string;
}

/**
 * TypeORM repository of the client-portfolio associations.
 *
 * Removing an association only deletes the row of `client_portfolio`: the
 * client and the portfolio are never deleted.
 *
 * The unique constraint `uq_client_portfolio_portfolio_client` is the last
 * guarantee against a duplicated association: the use case checks it first and
 * this repository translates the database error into a conflict.
 */
@Injectable()
export class TypeOrmClientPortfolioRepository
  implements ClientPortfolioRepository
{
  constructor(
    @InjectRepository(ClientPortfolioOrmEntity)
    private readonly repository: Repository<ClientPortfolioOrmEntity>,
  ) {}

  async findByPortfolio(portfolioId: number): Promise<ClientPortfolio[]> {
    const entities = await this.repository.find({
      where: { portfolioId },
      order: { id: 'ASC' },
    });

    return entities.map((entity) => ClientPortfolioMapper.toDomain(entity));
  }

  async findAssociation(
    portfolioId: number,
    clientId: number,
  ): Promise<ClientPortfolio | null> {
    const entity = await this.repository.findOne({
      where: { portfolioId, clientId },
    });

    return entity ? ClientPortfolioMapper.toDomain(entity) : null;
  }

  async associate(
    portfolioId: number,
    clientId: number,
  ): Promise<ClientPortfolio> {
    const entity = ClientPortfolioMapper.toPersistence(
      new ClientPortfolio(null, portfolioId, clientId),
    );

    try {
      const saved = await this.repository.save(entity);
      return ClientPortfolioMapper.toDomain(saved);
    } catch (error) {
      throw this.translateDuplicate(error);
    }
  }

  async removeAssociation(
    portfolioId: number,
    clientId: number,
  ): Promise<void> {
    const deleted = await this.repository.delete({ portfolioId, clientId });

    if (!deleted.affected) {
      throw new NotFoundError(
        `Client '${clientId}' is not associated to the portfolio '${portfolioId}'`,
      );
    }
  }

  private translateDuplicate(error: unknown): unknown {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as PostgresDriverError | undefined;
      if (driverError?.code === '23505') {
        return new ConflictError('Client already associated to the portfolio');
      }
    }
    return error;
  }
}
