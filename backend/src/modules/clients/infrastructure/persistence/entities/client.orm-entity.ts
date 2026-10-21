import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

// Constraint names must match the migration, otherwise migration:generate
// drops and recreates them.
@Entity({ name: 'client' })
@Unique('uq_client_nit', ['nit'])
export class ClientOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'nit', type: 'varchar' })
  nit: string;

  @Column({ name: 'business_name', type: 'varchar' })
  businessName: string;

  @Column({ name: 'trade_name', type: 'varchar', nullable: true })
  tradeName: string | null;

  @Column({ name: 'address', type: 'varchar', nullable: true })
  address: string | null;

  @Column({ name: 'department', type: 'varchar', nullable: true })
  department: string | null;

  @Column({ name: 'municipality', type: 'varchar', nullable: true })
  municipality: string | null;

  @Column({ name: 'neighborhood', type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string | null;

  // Catalog ids. Their foreign keys are added when the catalogs exist (HU-05).
  @Column({ name: 'zone_id', type: 'integer', nullable: true })
  zoneId: number | null;

  @Column({ name: 'client_type_id', type: 'integer', nullable: true })
  clientTypeId: number | null;

  @Column({ name: 'client_potential_id', type: 'integer', nullable: true })
  clientPotentialId: number | null;

  @Column({ name: 'client_status_id', type: 'integer', nullable: true })
  clientStatusId: number | null;

  @Column({ name: 'visit_frequency_days', type: 'integer', nullable: true })
  visitFrequencyDays: number | null;

  @Column({ name: 'latitude', type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ name: 'longitude', type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
