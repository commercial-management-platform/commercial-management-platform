import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ZONE' })
export class ZoneOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_zone' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'active', default: true })
  active: boolean;
}
