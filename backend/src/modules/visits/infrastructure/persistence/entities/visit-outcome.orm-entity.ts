import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { VisitResultOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/visit-result.orm-entity.js';
import { VisitOrmEntity } from './visit.orm-entity.js';

// Constraint and index names must match the migration, otherwise
// migration:generate drops and recreates them.
@Entity({ name: 'visit_outcome' })
@Unique('uq_visit_outcome_visit_id', ['visitId'])
@Index('IDX_visit_outcome_visit_result_id', ['visitResultId'])
export class VisitOutcomeOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'visit_id', type: 'integer' })
  visitId: number;

  @Column({ name: 'visit_result_id', type: 'integer' })
  visitResultId: number;

  @Column({ name: 'observation', type: 'text' })
  observation: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // At most one outcome per visit; the visit is never deleted while it has one.
  @OneToOne(() => VisitOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'visit_id',
    foreignKeyConstraintName: 'FK_visit_outcome_visit_id',
  })
  visit?: VisitOrmEntity;

  // Catalog entries are deactivated, never deleted, while an outcome references them.
  @ManyToOne(() => VisitResultOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'visit_result_id',
    foreignKeyConstraintName: 'FK_visit_outcome_visit_result_id',
  })
  visitResult?: VisitResultOrmEntity;
}
