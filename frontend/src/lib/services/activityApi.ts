import { http, type Paginated } from './http'

// Historial de un cliente (GET /api/clients/:clientId/activity, HU-16). Solo
// lectura: lo escriben los demás módulos al crear o cambiar datos del cliente.

export type ActivityAction =
  | 'client.created'
  | 'client.updated'
  | 'client.status_changed'
  | 'client.imported'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.status_changed'
  | 'contact.primary_changed'
  | 'client.portfolio_added'
  | 'client.portfolio_removed'
  | 'quote.created'
  | 'quote.status_changed'
  | 'follow_up.created'
  | 'follow_up.completed'
  | 'sales_order.created'
  | 'sales_order.status_changed'
  | 'visit.scheduled'
  | 'visit.rescheduled'
  | 'visit.cancelled'
  | 'visit.completed'

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
  'client.imported': 'Importado desde CSV',
  'contact.created': 'Contacto agregado',
  'contact.updated': 'Contacto actualizado',
  'contact.status_changed': 'Estado de contacto',
  'contact.primary_changed': 'Contacto principal',
  'client.portfolio_added': 'Agregado a portafolio',
  'client.portfolio_removed': 'Retirado de portafolio',
  'quote.created': 'Cotización creada',
  'quote.status_changed': 'Estado de cotización',
  'follow_up.created': 'Seguimiento programado',
  'follow_up.completed': 'Seguimiento completado',
  'sales_order.created': 'Pedido registrado',
  'sales_order.status_changed': 'Estado de pedido',
  'visit.scheduled': 'Visita programada',
  'visit.rescheduled': 'Visita reprogramada',
  'visit.cancelled': 'Visita cancelada',
  'visit.completed': 'Visita registrada',
}

/** Más reciente primero. El asesor solo consulta clientes de sus rutas (si no, 404). */
export const listClientActivity = (clientId: number, page = 1, limit = 10) =>
  http<Paginated<ApiActivityEntry>>(`/clients/${clientId}/activity`, { query: { page, limit } })
