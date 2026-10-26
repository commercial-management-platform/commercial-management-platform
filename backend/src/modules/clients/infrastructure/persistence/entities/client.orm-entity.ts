import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ClientPotentialOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/client-potential.orm-entity.js';
import { ClientStatusOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/client-status.orm-entity.js';
import { ClientTypeOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/client-type.orm-entity.js';
import { ZoneOrmEntity } from '../../../../catalogs/infrastructure/persistence/entities/zone.orm-entity.js';

// Constraint names must match the migration, otherwise migration:generate
// drops and recreates them.
@Entity({ name: 'client' })
@Unique('uq_client_nit', ['nit'])
@Index('IDX_client_zone_id', ['zoneId'])
@Index('IDX_client_client_type_id', ['clientTypeId'])
@Index('IDX_client_client_potential_id', ['clientPotentialId'])
@Index('IDX_client_client_status_id', ['clientStatusId'])
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

  // Catalog ids (HU-05). The relations below only declare the foreign keys
  // created by the AddClientCatalogForeignKeys migration; they are never
  // loaded, the ids are read and written through these columns.
  @Column({ name: 'zone_id', type: 'integer', nullable: true })
  zoneId: number | null;

  @Column({ name: 'client_type_id', type: 'integer', nullable: true })
  clientTypeId: number | null;

  @Column({ name: 'client_potential_id', type: 'integer', nullable: true })
  clientPotentialId: number | null;

  @Column({ name: 'client_status_id', type: 'integer', nullable: true })
  clientStatusId: number | null;

  @ManyToOne(() => ZoneOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'zone_id',
    foreignKeyConstraintName: 'FK_client_zone_id',
  })
  zone?: ZoneOrmEntity | null;

  @ManyToOne(() => ClientTypeOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_type_id',
    foreignKeyConstraintName: 'FK_client_client_type_id',
  })
  clientType?: ClientTypeOrmEntity | null;

  @ManyToOne(() => ClientPotentialOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_potential_id',
    foreignKeyConstraintName: 'FK_client_client_potential_id',
  })
  clientPotential?: ClientPotentialOrmEntity | null;

  @ManyToOne(() => ClientStatusOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_status_id',
    foreignKeyConstraintName: 'FK_client_client_status_id',
  })
  clientStatus?: ClientStatusOrmEntity | null;

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
