import { http } from './http'

// Catálogos comerciales del backend (GET /api/catalogs/*, HU-05). Cualquier
// usuario autenticado lee las entradas activas; solo el admin escribe.

export interface CatalogEntry {
  id: number
  name: string
  active: boolean
  /** Solo en potenciales: prioridad de despliegue. */
  order?: number
}

const CATALOG_PATHS = {
  zones: 'zones',
  clientTypes: 'client-types',
  potentials: 'potentials',
  clientStatuses: 'client-statuses',
  visitResults: 'visit-results',
  visitObjectives: 'visit-objectives',
  visitTypes: 'visit-types',
} as const

export type Catalog = keyof typeof CATALOG_PATHS
export type ClientCatalog = 'zones' | 'clientTypes' | 'potentials' | 'clientStatuses'
export type VisitCatalog = 'visitResults' | 'visitObjectives' | 'visitTypes'

/** `includeInactive` solo tiene efecto para el admin. */
export const listCatalog = (catalog: Catalog, includeInactive = false) =>
  http<CatalogEntry[]>(`/catalogs/${CATALOG_PATHS[catalog]}`, { query: { includeInactive: includeInactive || undefined } })

// Zonas: el único catálogo con escritura (solo admin).
export const createZone = (name: string) => http<CatalogEntry>('/catalogs/zones', { method: 'POST', body: { name } })

export const renameZone = (id: number, name: string) =>
  http<CatalogEntry>(`/catalogs/zones/${id}`, { method: 'PATCH', body: { name } })

export const setZoneActive = (id: number, active: boolean) =>
  http<{ message: string }>(`/catalogs/zones/${id}/status`, { method: 'PATCH', body: { active } })
