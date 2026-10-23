import { http, type Paginated } from './http'

// Pedidos del backend (/api/sales-orders, HU-14). Guardan el valor total, no
// líneas de producto: si vienen de una cotización, el detalle es el de ella.
// Todos crean (el asesor, para clientes de sus rutas); cambiar el estado es del gestor.

export type SalesOrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled'

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

/** Flujo normal; "cancelado" queda fuera. */
export const SALES_ORDER_FLOW: SalesOrderStatus[] = ['pending', 'confirmed', 'delivered']

/** Transiciones que acepta el backend. */
export const SALES_ORDER_NEXT: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export interface ApiSalesOrder {
  id: number
  /** PED-0001 */
  number: string
  clientId: number
  quoteId: number | null
  visitId: number | null
  advisorId: number
  /** YYYY-MM-DD */
  date: string
  /** Texto decimal. */
  value: string
  status: SalesOrderStatus
  /** YYYY-MM-DD */
  estimatedDeliveryDate: string
  createdAt: string
  updatedAt: string
}

export interface ListSalesOrdersQuery {
  clientId?: number
  advisorId?: number
  status?: SalesOrderStatus
  fromDate?: string
  toDate?: string
  page?: number
  /** Máximo 100. */
  limit?: number
}

export const listSalesOrders = (query: ListSalesOrdersQuery = {}) =>
  http<Paginated<ApiSalesOrder>>('/sales-orders', { query: { ...query } })

export const getSalesOrder = (id: number) => http<ApiSalesOrder>(`/sales-orders/${id}`)

/** Pedido directo. `advisorId` es obligatorio para el gestor; el asesor lo omite. */
export const createSalesOrder = (payload: {
  clientId: number
  date: string
  value: string
  estimatedDeliveryDate: string
  advisorId?: number
  visitId?: number
}) => http<ApiSalesOrder>('/sales-orders', { method: 'POST', body: payload })

/** Copia cliente, asesor y valor de la cotización. 409 si ya tiene pedido. */
export const createSalesOrderFromQuote = (
  quoteId: number,
  payload: { date: string; estimatedDeliveryDate: string; visitId?: number },
) => http<ApiSalesOrder>(`/quotes/${quoteId}/sales-order`, { method: 'POST', body: payload })

/** Solo gestor. */
export const changeSalesOrderStatus = (id: number, status: SalesOrderStatus) =>
  http<ApiSalesOrder>(`/sales-orders/${id}/status`, { method: 'PATCH', body: { status } })
