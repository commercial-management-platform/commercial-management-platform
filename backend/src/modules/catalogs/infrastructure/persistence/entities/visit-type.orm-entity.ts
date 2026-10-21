import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'VISIT_TYPE' })
export class VisitTypeOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_visit_type' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'active', default: true })
  active: boolean;
}
