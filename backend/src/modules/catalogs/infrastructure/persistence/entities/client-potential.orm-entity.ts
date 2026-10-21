import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'CLIENT_POTENTIAL' })
export class ClientPotentialOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_client_potential' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'catalog_order' })
  order: number;

  @Column({ name: 'active', default: true })
  active: boolean;
}
