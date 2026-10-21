import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'VISIT_OBJECTIVE' })
export class VisitObjectiveOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id_visit_objective' })
  id: number;

  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'active', default: true })
  active: boolean;
}
