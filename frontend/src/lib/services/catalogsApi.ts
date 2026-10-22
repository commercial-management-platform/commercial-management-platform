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

export const CLIENT_CATALOGS = {
  zones: 'zones',
  clientTypes: 'client-types',
  potentials: 'potentials',
  clientStatuses: 'client-statuses',
} as const

export type ClientCatalog = keyof typeof CLIENT_CATALOGS

export const listCatalog = (catalog: ClientCatalog, includeInactive = false) =>
  http<CatalogEntry[]>(`/catalogs/${CLIENT_CATALOGS[catalog]}`, { query: { includeInactive: includeInactive || undefined } })
