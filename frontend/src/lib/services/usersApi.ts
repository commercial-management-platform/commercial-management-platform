import type { UserRole } from './auth'
import { http } from './http'

// Usuarios del backend (GET /api/users). Solo el rol admin tiene acceso.

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

export const listUsers = () => http<ApiUser[]>('/users')
