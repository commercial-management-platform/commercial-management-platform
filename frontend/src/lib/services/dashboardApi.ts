import { http, type Paginated } from './http'
import type { VisitStatus } from './visitsApi'

// Dashboard comercial (/api/dashboard, HU-15) y su exportación CSV
// (/api/reports/visit-tracking/export, HU-17). Todo se calcula en el backend;
// el asesor solo recibe lo suyo, sin importar el asesor que envíe.

/** Montos como texto decimal ("1250000.500000") para no perder precisión. */
export interface CommercialKpis {
  scheduledVisits: number
  completedVisits: number
  /** Realizadas ÷ programadas, porcentaje entero. */
  effectiveness: number
  quotedValue: string
  /** Pedidos confirmados o entregados. */
  closedOrders: number
  billedValue: string
}

export interface DashboardKpis {
  /** Lunes y domingo (YYYY-MM-DD) y número de semana ISO. */
  week: { from: string; to: string; isoWeek: number }
  current: CommercialKpis
  /** La semana anterior, para la tendencia. */
  previous: CommercialKpis
}

export interface TrackingRow {
  visitId: number
  /** Instante UTC (ISO 8601). */
  scheduledDate: string
  /** Día de la visita en hora de Colombia (YYYY-MM-DD). */
  date: string
  isoWeek: number
  advisorId: number
  advisorName: string
  zone: string | null
  routeId: number | null
  routeName: string | null
  clientId: number
  clientName: string
  municipality: string | null
  clientType: string | null
  clientPotential: string | null
  status: VisitStatus
  /** Resultado registrado de la visita (catálogo, HU-09). */
  result: string | null
  /** "COT-0001 / COT-0004" si hay varias. */
  quoteNumbers: string | null
  quoteValue: string | null
  orderNumbers: string | null
  /** YYYY-MM-DD */
  nextFollowUp: string | null
}

export interface DashboardFilters {
  /** Cualquier día de la semana (YYYY-MM-DD); sin ella, la semana actual. */
  week?: string
  zoneId?: number
  /** Se ignora para el asesor. */
  advisorId?: number
}

export interface TrackingFilters extends DashboardFilters {
  status?: VisitStatus
  /** Texto en el cliente, municipio, asesor o ruta. */
  search?: string
}

export const getDashboardKpis = (filters: DashboardFilters = {}) =>
  http<DashboardKpis>('/dashboard/kpis', { query: { ...filters } })

export const listTracking = (filters: TrackingFilters & { page?: number; limit?: number }) =>
  http<Paginated<TrackingRow>>('/dashboard/tracking', { query: { ...filters } })

/** CSV con las mismas columnas y filtros de la tabla; puede tardar con muchos datos. */
export const exportTracking = (filters: TrackingFilters) =>
  http<Blob>('/reports/visit-tracking/export', {
    query: { ...filters },
    responseType: 'blob',
    signal: AbortSignal.timeout(120_000),
  })
