import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'VISIT_RESULT' })
export class VisitResultOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_visit_result' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'active', default: true })
  active: boolean;
}
