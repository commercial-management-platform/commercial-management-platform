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
import { VisitOrmEntity } from '../../../../visits/infrastructure/persistence/entities/visit.orm-entity.js';
import { AdvisorOrmEntity } from '../../../../users/infrastructure/persistence/entities/advisor.orm-entity.js';

@Entity({ name: 'follow_up' })
@Index('IDX_follow_up_visit_id', ['visitId'])
@Index('IDX_follow_up_responsible_advisor_id', ['responsibleAdvisorId'])
@Index('IDX_follow_up_next_date', ['nextDate'])
@Index('IDX_follow_up_completed', ['completed'])
export class FollowUpOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'visit_id', type: 'integer' })
  visitId: number;

  @Column({ name: 'next_date', type: 'date' })
  nextDate: string;

  @Column({ name: 'next_time', type: 'time', nullable: true })
  nextTime: string | null;

  @Column({ name: 'activity', type: 'varchar', length: 255 })
  activity: string;

  @Column({ name: 'observation', type: 'text', nullable: true })
  observation: string | null;

  @Column({ name: 'responsible_advisor_id', type: 'integer' })
  responsibleAdvisorId: number;

  @Column({ name: 'completed', type: 'boolean', default: false })
  completed: boolean;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => VisitOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'visit_id', foreignKeyConstraintName: 'FK_follow_up_visit_id' })
  visit?: VisitOrmEntity;

  @ManyToOne(() => AdvisorOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsible_advisor_id', foreignKeyConstraintName: 'FK_follow_up_responsible_advisor_id' })
  responsibleAdvisor?: AdvisorOrmEntity;
}
