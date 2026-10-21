import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'CLIENT_TYPE' })
export class ClientTypeOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_client_type' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'active', default: true })
  active: boolean;
}
