import { http } from './http'

// Clientes del backend (/api/clients). Admin y director ven todos;
// un asesor solo ve los clientes de sus rutas.

/** ClientResponseDto del backend. Los ids de catálogo apuntan a /catalogs/* (HU-05). */
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
  zoneId?: number
  clientTypeId?: number
  clientPotentialId?: number
  clientStatusId?: number
}

/** Campos editables. En una edición, null borra el valor; en una creación se omiten los vacíos. */
export type ClientPayload = Omit<ApiClient, 'id' | 'active' | 'createdAt' | 'updatedAt'>

/** NIT colombiano como lo valida el backend: 9 dígitos y dígito de verificación opcional. */
export const NIT_PATTERN = /^[0-9]{9}(-?[0-9])?$/

export const listClients = (query: ListClientsQuery = {}) => http<ApiClient[]>('/clients', { query: { ...query } })

export const getClient = (id: number) => http<ApiClient>(`/clients/${id}`)

/** Solo admin y director. Un NIT repetido responde 409. */
export const createClient = (payload: ClientPayload) =>
  http<ApiClient>('/clients', { method: 'POST', body: withoutNulls(payload) })

export const updateClient = (id: number, payload: Partial<ClientPayload>) =>
  http<ApiClient>(`/clients/${id}`, { method: 'PATCH', body: payload })

/** Solo admin y director. Desactivar no borra el cliente ni su historial. */
export const setClientActive = (id: number, active: boolean) =>
  http<ApiClient>(`/clients/${id}/status`, { method: 'PATCH', body: { active } })

/** Nombre a mostrar: el comercial si existe, si no la razón social. */
export const clientDisplayName = (client: ApiClient) => client.tradeName || client.businessName

/** El POST no acepta null: los campos vacíos simplemente no se envían. */
function withoutNulls<T extends object>(payload: T): Partial<T> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null)) as Partial<T>
}
