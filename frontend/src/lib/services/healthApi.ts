import { http } from './http'

// Estado del backend (GET /api/health, público).

export interface HealthStatus {
  status: 'ok' | 'error'
  database: 'up' | 'down'
}

export const getHealth = () => http<HealthStatus>('/health', { auth: false })
