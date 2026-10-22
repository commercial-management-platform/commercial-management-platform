export const VISIT_REFERENCES = Symbol('VISIT_REFERENCES');

export interface ClientReference {
  id: number;
  active: boolean;
}

export interface AdvisorReference {
  id: number;
  active: boolean;
}

export interface RouteReference {
  id: number;
  advisorId: number;
  active: boolean;
  /** HH:mm in business time, or null. */
  suggestedStartTime: string | null;
}

export interface RouteClientReference {
  clientId: number;
  visitOrder: number;
  clientActive: boolean;
}

/**
 * Read-only access to the client, advisor, route and route_client tables.
 * The clients, users and routes modules do not export these queries, so
 * visits owns this port.
 */
export interface VisitReferencesPort {
  findClient(clientId: number): Promise<ClientReference | null>;
  findAdvisor(advisorId: number): Promise<AdvisorReference | null>;
  findRoute(routeId: number): Promise<RouteReference | null>;
  /** True when the client is on the route (route_client). */
  isClientOnRoute(routeId: number, clientId: number): Promise<boolean>;
  /** Clients of the route in visit order. */
  findRouteClients(routeId: number): Promise<RouteClientReference[]>;
}
