import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ClientOrmEntity } from '../../../../clients/infrastructure/persistence/entities/client.orm-entity.js';
import { PortfolioOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/portfolio.orm-entity.js';

// Constraint and index names must match the migration, otherwise
// migration:generate drops and recreates them.
@Entity({ name: 'client_portfolio' })
@Index('IDX_client_portfolio_client_id', ['clientId'])
// A client is associated to a portfolio only once. The unique index is the
// guarantee against a race between two concurrent requests.
@Unique('uq_client_portfolio_portfolio_client', ['portfolioId', 'clientId'])
export class ClientPortfolioOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'portfolio_id', type: 'integer' })
  portfolioId: number;

  @Column({ name: 'client_id', type: 'integer' })
  clientId: number;

  // Deleting a portfolio removes its client list.
  @ManyToOne(() => PortfolioOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'portfolio_id',
    foreignKeyConstraintName: 'FK_client_portfolio_portfolio_id',
  })
  portfolio?: PortfolioOrmEntity;

  // Clients are deactivated, never deleted, while they belong to a portfolio.
  @ManyToOne(() => ClientOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_id',
    foreignKeyConstraintName: 'FK_client_portfolio_client_id',
  })
  client?: ClientOrmEntity;
}
