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

/** Client fields needed by the visit form and the location check-in (HU-09). */
export interface ClientDetails {
  id: number;
  businessName: string;
  tradeName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  zoneId: number | null;
}

export interface ZoneReference {
  id: number;
  name: string;
}

export interface RouteNameReference {
  id: number;
  name: string;
}

export interface AdvisorDetails {
  id: number;
  name: string;
}

/** Active primary contact of a client; absent when it has none. */
export interface PrimaryContactReference {
  name: string;
  phone: string | null;
  mobile: string | null;
  email: string | null;
}

/**
 * Read-only access to the client, advisor, route, route_client and contact
 * tables. The clients, users, routes and contacts modules do not export all
 * of these queries, so visits owns this port.
 */
export interface VisitReferencesPort {
  findClient(clientId: number): Promise<ClientReference | null>;
  findAdvisor(advisorId: number): Promise<AdvisorReference | null>;
  findRoute(routeId: number): Promise<RouteReference | null>;
  /** True when the client is on the route (route_client). */
  isClientOnRoute(routeId: number, clientId: number): Promise<boolean>;
  /** Clients of the route in visit order. */
  findRouteClients(routeId: number): Promise<RouteClientReference[]>;
  /** Fuller client record, for the visit form and the check-in distance (HU-09). */
  findClientDetails(clientId: number): Promise<ClientDetails | null>;
  findZone(zoneId: number): Promise<ZoneReference | null>;
  findRouteName(routeId: number): Promise<RouteNameReference | null>;
  findAdvisorDetails(advisorId: number): Promise<AdvisorDetails | null>;
  findPrimaryContact(clientId: number): Promise<PrimaryContactReference | null>;
}
