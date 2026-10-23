import { http, type Paginated } from './http'

// Cotizaciones del backend (/api/quotes, HU-12 y HU-13).
// - Todos crean; el asesor solo para clientes de sus rutas y a su nombre.
// - Los productos solo se editan en borrador; el valor lo calcula el backend.
// - Cambiar el estado (enviar, aprobar, rechazar) es solo del gestor.

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected'

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

/** Transiciones que acepta el backend. */
export const QUOTE_NEXT: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}

/** Montos y cantidades llegan como texto decimal ("1250.50") para no perder precisión. */
export interface ApiQuote {
  id: number
  /** COT-0001 */
  number: string
  clientId: number
  /** Id de la tabla advisor. */
  advisorId: number
  visitId: number | null
  /** YYYY-MM-DD */
  date: string
  value: string
  currency: string
  status: QuoteStatus
  documentKey: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiQuoteDetail {
  id: number
  quoteId: number
  product: string
  quantity: string
  price: string
  subtotal: string
  createdAt: string
  updatedAt: string
}

export interface ApiQuoteWithDetails extends ApiQuote {
  details: ApiQuoteDetail[]
}

export interface ListQuotesQuery {
  clientId?: number
  advisorId?: number
  status?: QuoteStatus
  fromDate?: string
  toDate?: string
  page?: number
  /** Máximo 100. */
  limit?: number
}

export interface DetailPayload {
  product: string
  quantity: string
  price: string
}

export const listQuotes = (query: ListQuotesQuery = {}) => http<Paginated<ApiQuote>>('/quotes', { query: { ...query } })

export const getQuote = (id: number) => http<ApiQuoteWithDetails>(`/quotes/${id}`)

/** Nace en borrador y con valor 0. `advisorId` es obligatorio para el gestor; el asesor lo omite. */
export const createQuote = (payload: { clientId: number; date: string; advisorId?: number; visitId?: number }) =>
  http<ApiQuote>('/quotes', { method: 'POST', body: payload })

/** Solo en borrador. 400 si el total supera el límite del backend. */
export const addQuoteDetail = (quoteId: number, payload: DetailPayload) =>
  http<ApiQuoteDetail>(`/quotes/${quoteId}/details`, { method: 'POST', body: payload })

export const updateQuoteDetail = (quoteId: number, detailId: number, payload: Partial<Omit<DetailPayload, 'product'>>) =>
  http<ApiQuoteDetail>(`/quotes/${quoteId}/details/${detailId}`, { method: 'PATCH', body: payload })

export const removeQuoteDetail = (quoteId: number, detailId: number) =>
  http<void>(`/quotes/${quoteId}/details/${detailId}`, { method: 'DELETE' })

/** Solo gestor. */
export const changeQuoteStatus = (id: number, status: QuoteStatus) =>
  http<ApiQuote>(`/quotes/${id}/status`, { method: 'PATCH', body: { status } })

/** Número a texto decimal como lo espera el backend (máximo 2 decimales). */
export const toDecimal = (value: number) => String(Math.round(value * 100) / 100)
