import { http, type Paginated } from './http'

// Historial de un cliente (GET /api/clients/:clientId/activity, HU-16). Solo
// lectura: lo escriben los demás módulos al crear o cambiar datos del cliente.

export type ActivityAction =
  | 'client.created'
  | 'client.updated'
  | 'client.status_changed'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.status_changed'
  | 'contact.primary_changed'
  | 'client.portfolio_added'
  | 'client.portfolio_removed'

export interface ApiActivityEntry {
  id: number
  clientId: number
  action: ActivityAction
  /** Texto en inglés generado por el backend; en pantalla se usa `ACTIVITY_LABELS`. */
  description: string
  createdAt: string
  user: { id: string; name: string | null }
}

export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  'client.created': 'Cliente creado',
  'client.updated': 'Datos actualizados',
  'client.status_changed': 'Cambio de estado',
  'contact.created': 'Contacto agregado',
  'contact.updated': 'Contacto actualizado',
  'contact.status_changed': 'Estado de contacto',
  'contact.primary_changed': 'Contacto principal',
  'client.portfolio_added': 'Agregado a portafolio',
  'client.portfolio_removed': 'Retirado de portafolio',
}

/** Más reciente primero. El asesor solo consulta clientes de sus rutas (si no, 404). */
export const listClientActivity = (clientId: number, page = 1, limit = 10) =>
  http<Paginated<ApiActivityEntry>>(`/clients/${clientId}/activity`, { query: { page, limit } })
