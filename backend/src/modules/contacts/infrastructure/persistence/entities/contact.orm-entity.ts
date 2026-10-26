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

// Constraint and index names must match the migration, otherwise
// migration:generate drops and recreates them.
@Entity({ name: 'contact' })
@Index('IDX_contact_client_id', ['clientId'])
// A client has at most one primary contact. The partial unique index is the
// last guarantee, the repository demotes the previous one in the same
// transaction.
@Index('uq_contact_one_primary_per_client', ['clientId'], {
  unique: true,
  where: '"is_primary" = true',
})
export class ContactOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'client_id', type: 'integer' })
  clientId: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'job_title', type: 'varchar', nullable: true })
  jobTitle: string | null;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'mobile', type: 'varchar', nullable: true })
  mobile: string | null;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Clients are deactivated, never deleted, while a contact belongs to them.
  @ManyToOne(() => ClientOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_id',
    foreignKeyConstraintName: 'FK_contact_client_id',
  })
  client?: ClientOrmEntity;
}
