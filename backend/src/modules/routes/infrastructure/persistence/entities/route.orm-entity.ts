import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ZoneOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/zone.orm-entity.js';
import { AdvisorOrmEntity } from '../../../../users/infrastructure/persistence/entities/advisor.orm-entity.js';
import type { RouteStatus } from '../../../domain/route-status.js';

// Constraint and index names must match the migration, otherwise
// migration:generate drops and recreates them.
@Entity({ name: 'route' })
@Index('IDX_route_zone_id', ['zoneId'])
@Index('IDX_route_advisor_id', ['advisorId'])
export class RouteOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'zone_id' })
  zoneId: number;

  @Column({ name: 'execution_days', type: 'varchar', nullable: true })
  executionDays: string | null;

  @Column({ name: 'frequency', type: 'varchar', nullable: true })
  frequency: string | null;

  @Column({ name: 'suggested_start_time', type: 'varchar', nullable: true })
  suggestedStartTime: string | null;

  @Column({ name: 'suggested_end_time', type: 'varchar', nullable: true })
  suggestedEndTime: string | null;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string | null;

  @Column({ name: 'advisor_id' })
  advisorId: number;

  // TypeORM reads and writes 'date' columns as YYYY-MM-DD strings.
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'status', type: 'varchar' })
  status: RouteStatus;

  // The relations only declare the foreign keys and allow filtering by
  // advisor.user_id; the ids are read and written through the columns above.
  @ManyToOne(() => ZoneOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'zone_id', foreignKeyConstraintName: 'FK_route_zone_id' })
  zone?: ZoneOrmEntity;

  @ManyToOne(() => AdvisorOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'advisor_id',
    foreignKeyConstraintName: 'FK_route_advisor_id',
  })
  advisor?: AdvisorOrmEntity;
}
