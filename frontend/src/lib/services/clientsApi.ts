import { http } from './http'

// Clientes del backend (GET /api/clients). Admin y director ven todos;
// un asesor solo ve los clientes de sus rutas.

/** ClientResponseDto del backend. Los ids de catálogo llegan en null hasta HU-05. */
export interface ApiClient {
  id: number
  nit: string
  businessName: string
  tradeName: string | null
  address: string | null
  department: string | null
  municipality: string | null
  neighborhood: string | null
  phone: string | null
  email: string | null
  zoneId: number | null
  clientTypeId: number | null
  clientPotentialId: number | null
  clientStatusId: number | null
  visitFrequencyDays: number | null
  latitude: number | null
  longitude: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ListClientsQuery {
  search?: string
  active?: boolean
}

export const listClients = (query: ListClientsQuery = {}) => http<ApiClient[]>('/clients', { query: { ...query } })

/** Nombre a mostrar: el comercial si existe, si no la razón social. */
export const clientDisplayName = (client: ApiClient) => client.tradeName || client.businessName
