import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { ClientOrmEntity } from '../../../../clients/infrastructure/persistence/entities/client.orm-entity.js';
import { RouteOrmEntity } from './route.orm-entity.js';

// Constraint names must match the migration, otherwise migration:generate
// drops and recreates them.
@Entity({ name: 'route_client' })
@Index('IDX_route_client_client_id', ['clientId'])
@Unique('uq_route_client_route_client', ['routeId', 'clientId'])
// Deferred to commit, so a reorder can swap two positions inside its transaction.
@Unique('uq_route_client_route_visit_order', ['routeId', 'visitOrder'], {
  deferrable: 'INITIALLY DEFERRED',
})
export class RouteClientOrmEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'route_id' })
  routeId: number;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ name: 'visit_order' })
  visitOrder: number;

  @ManyToOne(() => RouteOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'route_id',
    foreignKeyConstraintName: 'fk_route_client_route',
  })
  route?: RouteOrmEntity;

  // Clients are deactivated, never deleted, while a route uses them.
  @ManyToOne(() => ClientOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'client_id',
    foreignKeyConstraintName: 'fk_route_client_client',
  })
  client?: ClientOrmEntity;
}
