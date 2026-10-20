import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import type { RouteStatus } from '../../../domain/route-status.js';

@Entity({ name: 'route' })
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
}
