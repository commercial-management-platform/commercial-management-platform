import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'route_client' })
@Unique(['routeId', 'clientId'])
export class RouteClientOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'route_id' })
  routeId: number;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ name: 'visit_order' })
  visitOrder: number;
}
