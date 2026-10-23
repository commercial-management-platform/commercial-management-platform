import type { CatalogEntry } from './catalogsApi'
import type { ApiClient } from './clientsApi'
import { http } from './http'

// Portafolios de clientes (HU-06). La lista sale de GET /catalogs/portfolios
// (se siembran, no tienen CRUD); aquí solo se maneja qué clientes tiene cada uno.
// Todos los roles consultan (el asesor solo ve clientes de sus rutas); asociar y
// retirar es de admin y director.

export interface ApiPortfolio extends CatalogEntry {
  description?: string | null
}

export const listPortfolios = () => http<ApiPortfolio[]>('/catalogs/portfolios')

export const listPortfolioClients = (portfolioId: number) => http<ApiClient[]>(`/portfolios/${portfolioId}/clients`)

/** 409 si el cliente ya está; 400 si el portafolio está desactivado. */
export const addClientToPortfolio = (portfolioId: number, clientId: number) =>
  http<{ success: boolean }>(`/portfolios/${portfolioId}/clients/${clientId}`, { method: 'POST' })

/** El cliente y el portafolio se conservan; solo se quita la asociación. */
export const removeClientFromPortfolio = (portfolioId: number, clientId: number) =>
  http<{ success: boolean }>(`/portfolios/${portfolioId}/clients/${clientId}`, { method: 'DELETE' })
