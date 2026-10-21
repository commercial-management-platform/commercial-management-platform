import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Case-insensitive unique index on LOWER(name), created by the migration.
// TypeORM cannot describe functional indexes, so it must not synchronize it.
@Entity({ name: 'zone' })
@Index('uq_zone_name_lower', { synchronize: false })
export class ZoneOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;
}
