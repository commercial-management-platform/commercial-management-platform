import { http } from './http'

// Rutas comerciales del backend (/api/routes, HU-07). Admin y director ven y
// gestionan todas; el asesor solo consulta las suyas (las demás responden 404).

export type RouteStatus = 'active' | 'inactive'

export interface ApiRoute {
  id: number
  name: string
  zoneId: number
  /** Texto libre, p. ej. "Lunes, Miércoles". */
  executionDays: string | null
  frequency: string | null
  /** HH:mm */
  suggestedStartTime: string | null
  suggestedEndTime: string | null
  description: string | null
  /** Id de la tabla advisor, no del usuario. */
  advisorId: number
  /** YYYY-MM-DD */
  startDate: string
  endDate: string | null
  status: RouteStatus
}

export interface ApiRouteClient {
  id: number
  routeId: number
  clientId: number
  visitOrder: number
}

/** Campos editables. En una creación los opcionales vacíos se omiten. */
export type RoutePayload = Omit<ApiRoute, 'id'>

export const listRoutes = () => http<ApiRoute[]>('/routes')

export const getRoute = (id: number) => http<ApiRoute>(`/routes/${id}`)

/** Solo gestor. 400 si la zona o el asesor no existen o están inactivos. */
export const createRoute = (payload: RoutePayload) =>
  http<ApiRoute>('/routes', { method: 'POST', body: withoutNulls(payload) })

/** Solo gestor. En los campos opcionales, null borra el valor. */
export const updateRoute = (id: number, payload: Partial<RoutePayload>) =>
  http<ApiRoute>(`/routes/${id}`, { method: 'PATCH', body: payload })

/** En orden de visita. */
export const listRouteClients = (routeId: number) => http<ApiRouteClient[]>(`/routes/${routeId}/clients`)

/** Solo gestor. El cliente queda al final del recorrido; 409 si ya está en la ruta. */
export const addRouteClient = (routeId: number, clientId: number) =>
  http<{ success: boolean }>(`/routes/${routeId}/clients/${clientId}`, { method: 'POST' })

/** Solo gestor. El cliente se conserva; solo sale del recorrido. */
export const removeRouteClient = (routeId: number, clientId: number) =>
  http<{ success: boolean }>(`/routes/${routeId}/clients/${clientId}`, { method: 'DELETE' })

/** Solo gestor. Debe listar todos los clientes de la ruta, una vez cada uno, en el nuevo orden. */
export const reorderRouteClients = (routeId: number, clientIds: number[]) =>
  http<{ success: boolean }>(`/routes/${routeId}/clients/order`, { method: 'PATCH', body: { clientIds } })

/** El POST no acepta null: los campos vacíos simplemente no se envían. */
function withoutNulls<T extends object>(payload: T): Partial<T> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null)) as Partial<T>
}
