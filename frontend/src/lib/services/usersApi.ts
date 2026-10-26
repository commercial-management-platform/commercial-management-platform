import type { UserRole } from './auth'
import { http } from './http'

// Usuarios del backend (/api/users, HU-02). Hoy todo el módulo es solo para el
// rol admin: el director recibe 403 aunque la matriz le permita gestionar asesores.

export interface ApiUser {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  emailVerified: boolean
  image?: string | null
  createdAt: string
  updatedAt: string
}

export interface ListUsersQuery {
  role?: UserRole
  isActive?: boolean
  search?: string
}

export interface CreateUserPayload {
  name: string
  email: string
  /** Mínimo 8 caracteres. */
  password: string
  role: UserRole
}

export const PASSWORD_MIN_LENGTH = 8

export const listUsers = (query: ListUsersQuery = {}) => http<ApiUser[]>('/users', { query: { ...query } })

/** Un correo repetido responde 409. */
export const createUser = (payload: CreateUserPayload) => http<ApiUser>('/users', { method: 'POST', body: payload })

export const updateUser = (id: string, payload: { name: string }) =>
  http<ApiUser>(`/users/${id}`, { method: 'PATCH', body: payload })

/** 409 si dejaría la plataforma sin administradores activos. */
export const changeUserRole = (id: string, role: UserRole) =>
  http<ApiUser>(`/users/${id}/role`, { method: 'PATCH', body: { role } })

/** Desactivar no borra el historial comercial. 409 si es el último admin activo. */
export const setUserActive = (id: string, isActive: boolean) =>
  http<ApiUser>(`/users/${id}/status`, { method: 'PATCH', body: { isActive } })
