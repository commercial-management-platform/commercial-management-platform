import { http } from './http'

// Rutas comerciales del backend (/api/routes, HU-07). Admin y director ven y
// gestionan todas; el asesor solo consulta las suyas.

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

export const listRoutes = () => http<ApiRoute[]>('/routes')

/** En orden de visita. */
export const listRouteClients = (routeId: number) => http<ApiRouteClient[]>(`/routes/${routeId}/clients`)
