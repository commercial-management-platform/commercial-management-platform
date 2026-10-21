import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserOrmEntity } from '../../../../auth/infrastructure/persistence/entities/user.orm-entity.js';

// Constraint names must match the migration, otherwise migration:generate
// drops and recreates them.
@Entity({ name: 'advisor' })
@Unique('uq_advisor_user_id', ['userId'])
@Check('ck_advisor_status', `"status" IN ('active', 'inactive')`)
export class AdvisorOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'user_id', type: 'text' })
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'NO ACTION' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_advisor_user_id',
  })
  user?: UserOrmEntity;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'email', type: 'varchar' })
  email: string;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'status', type: 'varchar', default: 'active' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
