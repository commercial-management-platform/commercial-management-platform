import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'CLIENT_STATUS' })
export class ClientStatusOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_client_status' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'active', default: true })
  active: boolean;
}
