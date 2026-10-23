import { http } from './http'

// Asesores asignables (GET /api/advisors). Solo admin y director: el asesor
// recibe 403. El `id` es el de la tabla advisor, el que usan rutas, visitas,
// cotizaciones y pedidos; no el del usuario.

export interface ApiAdvisor {
  id: number
  userId: string
  name: string
  email: string
  phone: string | null
  status: 'active' | 'inactive'
}

/** Ordenados por nombre. `includeInactive` sirve para mostrar nombres en rutas o visitas antiguas. */
export const listAdvisors = (includeInactive = false) =>
  http<ApiAdvisor[]>('/advisors', { query: { includeInactive: includeInactive || undefined } })
