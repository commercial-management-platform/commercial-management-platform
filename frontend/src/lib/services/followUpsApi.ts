import { http, type Paginated } from './http'

// Seguimientos comerciales (HU-10). Nacen de una visita; el responsable es un
// asesor (por defecto, el de la visita). El asesor solo ve, edita y completa
// los suyos; admin y director, todos.

export type FollowUpStatus = 'pending' | 'overdue' | 'completed'

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: 'Pendiente',
  overdue: 'Vencido',
  completed: 'Completado',
}

export interface ApiFollowUp {
  id: number
  visitId: number
  /** YYYY-MM-DD */
  nextDate: string
  /** HH:mm o HH:mm:ss según el endpoint; usar `followUpTime`. */
  nextTime: string | null
  activity: string
  observation: string | null
  /** Id de la tabla advisor. */
  responsibleAdvisorId: number
  completed: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
  /** Vencido = pendiente con fecha pasada; lo calcula el backend. */
  status: FollowUpStatus
}

export interface ListFollowUpsQuery {
  status?: FollowUpStatus
  advisorId?: number
  /** YYYY-MM-DD */
  from?: string
  to?: string
  page?: number
  /** Máximo 100. */
  limit?: number
}

export interface FollowUpPayload {
  /** YYYY-MM-DD; no puede ser pasada. */
  nextDate: string
  /** HH:mm */
  nextTime?: string
  activity: string
  observation?: string
  /** Solo si el responsable no es el asesor de la visita. */
  responsibleAdvisorId?: number
}

export const listFollowUps = (query: ListFollowUpsQuery = {}) =>
  http<Paginated<ApiFollowUp>>('/follow-ups', { query: { ...query } })

export const createFollowUp = (visitId: number, payload: FollowUpPayload) =>
  http<ApiFollowUp>(`/visits/${visitId}/follow-ups`, { method: 'POST', body: payload })

/** Solo pendientes. La hora y el responsable no se pueden cambiar. */
export const updateFollowUp = (id: number, payload: { nextDate?: string; activity?: string; observation?: string }) =>
  http<ApiFollowUp>(`/follow-ups/${id}`, { method: 'PATCH', body: payload })

export const completeFollowUp = (id: number) => http<ApiFollowUp>(`/follow-ups/${id}/complete`, { method: 'PATCH' })

/** HH:mm, o '' si no tiene hora. */
export const followUpTime = (followUp: ApiFollowUp) => followUp.nextTime?.slice(0, 5) ?? ''
