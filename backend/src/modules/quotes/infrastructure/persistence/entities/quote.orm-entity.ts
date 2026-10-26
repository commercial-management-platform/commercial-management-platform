import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ClientOrmEntity } from '../../../../clients/infrastructure/persistence/entities/client.orm-entity.js';
import { AdvisorOrmEntity } from '../../../../users/infrastructure/persistence/entities/advisor.orm-entity.js';
import { VisitOrmEntity } from '../../../../visits/infrastructure/persistence/entities/visit.orm-entity.js';
import type { QuoteStatus } from '../../../domain/entities/quote-status.js';

// Constraint and index names must match the migration.
@Entity({ name: 'quote' })
@Index('UQ_quote_number', ['number'], { unique: true })
@Index('IDX_quote_client_id_date', ['clientId', 'date'])
@Index('IDX_quote_advisor_id_date', ['advisorId', 'date'])
@Index('IDX_quote_status', ['status'])
@Index('IDX_quote_visit_id', ['visitId'])
export class QuoteOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'number', type: 'varchar', length: 20 })
  number: string;

  @Column({ name: 'client_id', type: 'integer' })
  clientId: number;

  @Column({ name: 'advisor_id', type: 'integer' })
  advisorId: number;

  @Column({ name: 'visit_id', type: 'integer', nullable: true })
  visitId: number | null;

  @Column({ name: 'date', type: 'date' })
  date: string;

  // PostgreSQL numerics are intentionally strings: JavaScript floats lose money precision.
  @Column({
    name: 'value',
    type: 'numeric',
    precision: 18,
    scale: 6,
    default: '0',
  })
  value: string;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'COP' })
  currency: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'draft' })
  status: QuoteStatus;

  /** S3 object key; HU-20 owns uploading and signed URLs. */
  @Column({
    name: 'document_key',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  documentKey: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => ClientOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_id',
    foreignKeyConstraintName: 'FK_quote_client_id',
  })
  client?: ClientOrmEntity;

  @ManyToOne(() => AdvisorOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'advisor_id',
    foreignKeyConstraintName: 'FK_quote_advisor_id',
  })
  advisor?: AdvisorOrmEntity;

  @ManyToOne(() => VisitOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'visit_id',
    foreignKeyConstraintName: 'FK_quote_visit_id',
  })
  visit?: VisitOrmEntity | null;
}
