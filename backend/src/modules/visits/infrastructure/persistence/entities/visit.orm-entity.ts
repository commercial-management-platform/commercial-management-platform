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
} from 'typeorm';

import { ClientOrmEntity } from '../../../../clients/infrastructure/persistence/entities/client.orm-entity.js';
import { AdvisorOrmEntity } from '../../../../users/infrastructure/persistence/entities/advisor.orm-entity.js';
import { RouteOrmEntity } from '../../../../routes/infrastructure/persistence/entities/route.orm-entity.js';
import { VisitStatus } from '../../../domain/visit-status.js';

// Constraint and index names must match the migration, otherwise
// migration:generate drops and recreates them.
@Entity({ name: 'visit' })
@Index('IDX_visit_advisor_id_scheduled_date', ['advisorId', 'scheduledDate'])
@Index('IDX_visit_client_id', ['clientId'])
@Index('IDX_visit_route_id', ['routeId'])
@Index('IDX_visit_status', ['status'])
@Check('ck_visit_status', `"status" IN ('scheduled', 'visited', 'cancelled')`)
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
}
