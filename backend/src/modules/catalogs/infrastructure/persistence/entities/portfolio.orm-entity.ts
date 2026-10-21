import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Case-insensitive unique index on LOWER(name), created by the migration.
// TypeORM cannot describe functional indexes, so it must not synchronize it.
@Entity({ name: 'portfolio' })
@Index('uq_portfolio_name_lower', { synchronize: false })
export class PortfolioOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;
}
