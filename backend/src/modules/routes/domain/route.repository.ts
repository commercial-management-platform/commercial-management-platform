import type { Route } from './route.js';
import type { RouteClient } from './route-client.js';

export const ROUTE_REPOSITORY = Symbol('ROUTE_REPOSITORY');

export interface RouteRepository {
  findAll(): Promise<Route[]>;
  findById(id: number): Promise<Route | null>;
  save(route: Route): Promise<Route>;
  update(route: Route): Promise<Route>;
  findClients(routeId: number): Promise<RouteClient[]>;
  findAssociation(routeId: number, clientId: number): Promise<RouteClient | null>;
  associate(routeId: number, clientId: number, visitOrder: number): Promise<RouteClient>;
  removeAssociation(routeId: number, clientId: number): Promise<void>;
  reorder(routeId: number, clientIds: number[]): Promise<void>;
}
