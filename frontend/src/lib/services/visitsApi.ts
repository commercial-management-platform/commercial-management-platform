import { http, type Paginated } from './http'

// Visitas del backend (/api/visits, HU-08 y HU-09).
// - El gestor (admin y director) programa, reprograma, cancela y consulta todas.
// - El asesor consulta su agenda, inicia la visita (check-in) y registra el resultado.

export type VisitStatus = 'scheduled' | 'visited' | 'cancelled'
export type InterestLevel = 'high' | 'medium' | 'low'
export type InterestReason = 'quality' | 'price' | 'quality_price'

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: 'Programada',
  visited: 'Visitada',
  cancelled: 'Cancelada',
}

export const INTEREST_LEVEL_LABELS: Record<InterestLevel, string> = {
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
}

export const INTEREST_REASON_LABELS: Record<InterestReason, string> = {
  quality: 'Calidad',
  price: 'Precio',
  quality_price: 'Calidad y precio',
}

/** VisitResponseDto. Las fechas llegan en UTC (ISO 8601). */
export interface ApiVisit {
  id: number
  clientId: number
  /** Id de la tabla advisor, no del usuario. */
  advisorId: number
  routeId: number | null
  scheduledDate: string
  visitOrder: number | null
  actualDate: string | null
  status: VisitStatus
  startedAt: string | null
  finishedAt: string | null
  checkInLatitude: number | null
  checkInLongitude: number | null
  checkInDistanceMeters: number | null
  /** Lo decide solo el backend, con la distancia del check-in y el radio configurado. */
  locationConfirmed: boolean
  visitObjectiveId: number | null
  visitTypeId: number | null
  interestLevel: InterestLevel | null
  interestReason: InterestReason | null
  competitorMentioned: string | null
  createdAt: string
  updatedAt: string
}

export interface ListVisitsQuery {
  /** Un día (YYYY-MM-DD). No se combina con `week`. */
  date?: string
  /** Cualquier día de la semana buscada (lunes a domingo). */
  week?: string
  advisorId?: number
  zoneId?: number
  status?: VisitStatus
  page?: number
  limit?: number
}

interface ContactInfo {
  name: string
  phone: string | null
  mobile: string | null
  email: string | null
}

export interface ApiAgendaEntry {
  id: number
  routeId: number | null
  scheduledDate: string
  visitOrder: number | null
  actualDate: string | null
  status: VisitStatus
  client: { id: number; businessName: string; address: string | null }
  primaryContact: ContactInfo | null
  potential: { id: number; name: string } | null
}

/** Datos precargados del formulario de visita del asesor (HU-09, CA-04). */
export interface ApiVisitForm {
  visit: {
    id: number
    scheduledDate: string
    status: VisitStatus
    visitOrder: number | null
    startedAt: string | null
    locationConfirmed: boolean
  }
  client: {
    id: number
    businessName: string
    tradeName: string | null
    address: string | null
    latitude: number | null
    longitude: number | null
  }
  primaryContact: ContactInfo | null
  route: { id: number; name: string } | null
  zone: { id: number; name: string } | null
  advisor: { id: number; name: string }
  week: { date: string; isoWeek: number; weekday: string }
}

export interface ApiStartVisit extends ApiVisit {
  /** Distancia a las coordenadas del cliente, en metros. */
  distance: number | null
  checkInRadiusMeters: number
}

export interface OutcomePayload {
  visitObjectiveId: number
  visitTypeId: number
  visitResultId: number
  interestLevel: InterestLevel
  interestReason?: InterestReason
  observation: string
  competitorMentioned?: string
  /** Solo si la visita no se inició con startVisit. */
  startedAt?: string
  finishedAt?: string
}

export type SkipReason = 'inactive_client' | 'already_scheduled'

export interface GeneratedRouteVisits {
  created: ApiVisit[]
  skipped: { clientId: number; reason: SkipReason }[]
}

/** Colombia no tiene horario de verano: la hora de negocio siempre es UTC-5. */
export const businessDateTime = (date: string, time: string) => `${date}T${time}:00-05:00`

/** Fecha de hoy (YYYY-MM-DD) en hora de Colombia, como la calcula el backend. */
export const businessToday = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10)

export const listVisits = (query: ListVisitsQuery = {}) => http<Paginated<ApiVisit>>('/visits', { query: { ...query } })

export const getVisit = (id: number) => http<ApiVisit>(`/visits/${id}`)

/** Solo gestor. La fecha no puede estar en el pasado; si se envía ruta, el cliente debe estar en ella. */
export const scheduleVisit = (payload: { clientId: number; advisorId: number; scheduledDate: string; routeId?: number }) =>
  http<ApiVisit>('/visits', { method: 'POST', body: payload })

export const rescheduleVisit = (id: number, scheduledDate: string) =>
  http<ApiVisit>(`/visits/${id}/reschedule`, { method: 'PATCH', body: { scheduledDate } })

export const cancelVisit = (id: number) => http<ApiVisit>(`/visits/${id}/cancel`, { method: 'PATCH' })

/** Solo gestor: crea una visita por cada cliente de la ruta para ese día; informa los que omitió. */
export const generateRouteVisits = (routeId: number, date: string, time?: string) =>
  http<GeneratedRouteVisits>(`/routes/${routeId}/visits`, { method: 'POST', body: { date, time } })

/** Solo asesor: su agenda del día o de la semana (por defecto, hoy). */
export const getAgenda = (period: 'day' | 'week', date?: string) =>
  http<ApiAgendaEntry[]>('/visits/agenda', { query: { period, date } })

export const getVisitForm = (id: number) => http<ApiVisitForm>(`/visits/${id}/form`)

/** Solo asesor y el día de la visita. Se envía la ubicación cruda; el backend decide si confirma. */
export const startVisit = (id: number, coords: { latitude: number; longitude: number } | null) =>
  http<ApiStartVisit>(`/visits/${id}/start`, { method: 'POST', body: coords ?? {} })

export const recordVisitOutcome = (id: number, payload: OutcomePayload) =>
  http<ApiVisit>(`/visits/${id}/outcome`, { method: 'POST', body: payload })
