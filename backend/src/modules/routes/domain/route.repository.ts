import type { Route } from './route.js';
import type { RouteClient } from './route-client.js';

export const ROUTE_REPOSITORY = Symbol('ROUTE_REPOSITORY');

export interface VisitOrderItem {
  clientId: number;
  visitOrder: number;
}

export interface RouteFilterOptions {
  /** When set, only routes whose advisor has this betterAuth user id. */
  advisorUserId?: string;
}

export interface RouteRepository {
  findAll(options?: RouteFilterOptions): Promise<Route[]>;
  findById(id: number): Promise<Route | null>;
  /** True when the route's advisor is linked to the given betterAuth user. */
  isAssignedToAdvisorUser(routeId: number, userId: string): Promise<boolean>;
  save(route: Route): Promise<Route>;
  update(route: Route): Promise<Route>;
  findClients(routeId: number): Promise<RouteClient[]>;
  findAssociation(
    routeId: number,
    clientId: number,
  ): Promise<RouteClient | null>;
  associate(
    routeId: number,
    clientId: number,
    visitOrder: number,
  ): Promise<RouteClient>;
  removeAssociation(routeId: number, clientId: number): Promise<void>;
  reorder(routeId: number, items: VisitOrderItem[]): Promise<void>;
}
