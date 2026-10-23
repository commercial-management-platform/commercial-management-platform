import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

import { ClientOrmEntity } from '../../../../clients/infrastructure/persistence/entities/client.orm-entity.js';
import { VisitObjectiveOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/visit-objective.orm-entity.js';
import { VisitTypeOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/visit-type.orm-entity.js';
import { AdvisorOrmEntity } from '../../../../users/infrastructure/persistence/entities/advisor.orm-entity.js';
import { RouteOrmEntity } from '../../../../routes/infrastructure/persistence/entities/route.orm-entity.js';
import type { InterestLevel, InterestReason } from '../../../domain/visit-interest.js';
import { VisitStatus } from '../../../domain/visit-status.js';

// `numeric` columns come back from pg as strings so no precision is lost;
// the domain only ever needs plain JS numbers for the Haversine formula.
const numericTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

// Constraint and index names must match the migration, otherwise
// migration:generate drops and recreates them.
@Entity({ name: 'visit' })
@Index('IDX_visit_advisor_id_scheduled_date', ['advisorId', 'scheduledDate'])
@Index('IDX_visit_client_id', ['clientId'])
@Index('IDX_visit_route_id', ['routeId'])
@Index('IDX_visit_status', ['status'])
@Index('IDX_visit_visit_objective_id', ['visitObjectiveId'])
@Index('IDX_visit_visit_type_id', ['visitTypeId'])
@Check('ck_visit_status', `"status" IN ('scheduled', 'visited', 'cancelled')`)
@Check('ck_visit_interest_level', `"interest_level" IN ('high', 'medium', 'low')`)
@Check(
  'ck_visit_interest_reason',
  `"interest_reason" IN ('quality', 'price', 'quality_price')`,
)
export class VisitOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'client_id', type: 'integer' })
  clientId: number;

  @Column({ name: 'advisor_id', type: 'integer' })
  advisorId: number;

  @Column({ name: 'route_id', type: 'integer', nullable: true })
  routeId: number | null;

  @Column({ name: 'scheduled_date', type: 'timestamptz' })
  scheduledDate: Date;

  @Column({ name: 'visit_order', type: 'integer', nullable: true })
  visitOrder: number | null;

  @Column({ name: 'actual_date', type: 'timestamptz', nullable: true })
  actualDate: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'scheduled' })
  status: VisitStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({
    name: 'check_in_latitude',
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: numericTransformer,
  })
  checkInLatitude: number | null;

  @Column({
    name: 'check_in_longitude',
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: numericTransformer,
  })
  checkInLongitude: number | null;

  @Column({ name: 'check_in_distance_m', type: 'integer', nullable: true })
  checkInDistanceMeters: number | null;

  @Column({ name: 'location_confirmed', type: 'boolean', default: false })
  locationConfirmed: boolean;

  @Column({ name: 'visit_objective_id', type: 'integer', nullable: true })
  visitObjectiveId: number | null;

  @Column({ name: 'visit_type_id', type: 'integer', nullable: true })
  visitTypeId: number | null;

  @Column({ name: 'interest_level', type: 'varchar', length: 10, nullable: true })
  interestLevel: InterestLevel | null;

  @Column({ name: 'interest_reason', type: 'varchar', length: 20, nullable: true })
  interestReason: InterestReason | null;

  @Column({
    name: 'competitor_mentioned',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  competitorMentioned: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Clients, advisors and routes are deactivated, never deleted, while a
  // visit references them. The relations only declare the foreign keys; the
  // ids are read and written through the columns above.
  @ManyToOne(() => ClientOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_id',
    foreignKeyConstraintName: 'FK_visit_client_id',
  })
  client?: ClientOrmEntity;

  @ManyToOne(() => AdvisorOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'advisor_id',
    foreignKeyConstraintName: 'FK_visit_advisor_id',
  })
  advisor?: AdvisorOrmEntity;

  @ManyToOne(() => RouteOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'route_id',
    foreignKeyConstraintName: 'FK_visit_route_id',
  })
  route?: RouteOrmEntity | null;

  // Catalog entries are deactivated, never deleted, while a visit references them.
  @ManyToOne(() => VisitObjectiveOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'visit_objective_id',
    foreignKeyConstraintName: 'FK_visit_visit_objective_id',
  })
  visitObjective?: VisitObjectiveOrmEntity | null;

  @ManyToOne(() => VisitTypeOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'visit_type_id',
    foreignKeyConstraintName: 'FK_visit_visit_type_id',
  })
  visitType?: VisitTypeOrmEntity | null;
}
