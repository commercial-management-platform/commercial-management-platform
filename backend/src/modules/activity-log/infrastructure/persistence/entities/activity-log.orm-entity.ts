import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserOrmEntity } from '../../../../auth/infrastructure/persistence/entities/user.orm-entity.js';
import { ClientOrmEntity } from '../../../../clients/infrastructure/persistence/entities/client.orm-entity.js';

// Constraint and index names must match the migration, otherwise
// migration:generate drops and recreates them. The immutability trigger
// lives only in the migration.
@Entity({ name: 'activity_log' })
@Index('IDX_activity_log_client_id_created_at', ['clientId', 'createdAt'])
@Index('IDX_activity_log_user_id', ['userId'])
export class ActivityLogOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'client_id', type: 'integer' })
  clientId: number;

  // A plain column, not CreateDateColumn: it stores the moment the action
  // happened (ActivityLogEntry.occurredAt), sent by the use case.
  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'user_id', type: 'text' })
  userId: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  // Clients and users are deactivated, never deleted, while they have history.
  @ManyToOne(() => ClientOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_id',
    foreignKeyConstraintName: 'FK_activity_log_client_id',
  })
  client?: ClientOrmEntity;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_activity_log_user_id',
  })
  user?: UserOrmEntity;
}
