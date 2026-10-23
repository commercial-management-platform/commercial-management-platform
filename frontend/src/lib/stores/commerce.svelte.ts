import { ORDERS_IN_PROCESS, QUOTES_IN_PROCESS, orderStatusLabel, quoteStatusLabel, sameMonth } from '../domain/commerce'
import { api } from '../services/api'
import type { Asesor, NewOrder, NewQuote, Order, Quote } from '../types'
import { formatMoney } from '../utils/format'
import { LiveCollection } from './liveCollection.svelte'
import { toasts } from './toasts.svelte'

// --- Asesores simulados ---------------------------------------------------------

/** Asesores del servidor simulado, mientras cotizaciones y pedidos no usen el backend. */
class MockAdvisors {
  list = $state<Asesor[]>([])
  byId = $derived(new Map(this.list.map((a) => [a.id, a])))

  async load() {
    if (!this.list.length) this.list = (await api.fetchRoutes()).asesores
  }
}

export const mockAdvisors = new MockAdvisors()

// --- Cotizaciones -------------------------------------------------------------

export const quotesStore = new LiveCollection<Quote>(
  () => api.fetchQuotes(),
  (event) => {
    if (event.type === 'quote.created') {
      if (quotesStore.add(event.quote)) {
        quotesStore.flash('kpi')
        toasts.push({
          tone: 'info',
          icon: 'file-text',
          title: 'Nueva cotización',
          message: `${event.quote.numero} · ${event.quote.cliente} · ${formatMoney(event.quote.valor)}`,
        })
      }
    } else if (event.type === 'quote.updated') {
      const quote = quotesStore.patch(event.quoteId, event.patch)
      if (quote && event.patch.estado) {
        quotesStore.flash('kpi')
        if (event.patch.estado === 'aprobada' || event.patch.estado === 'rechazada') {
          toasts.push({
            tone: event.patch.estado === 'aprobada' ? 'success' : 'warning',
            icon: event.patch.estado === 'aprobada' ? 'check' : 'alert-circle',
            title: `Cotización ${quoteStatusLabel[event.patch.estado].toLowerCase()}`,
            message: `${quote.numero} · ${quote.cliente}`,
          })
        }
      }
    }
  },
)

export const quoteTotals = () => ({
  total: quotesStore.items.length,
  enProceso: quotesStore.items.filter((q) => QUOTES_IN_PROCESS.includes(q.estado)).length,
  esteMes: quotesStore.items.filter((q) => sameMonth(q.fecha)).reduce((sum, q) => sum + q.valor, 0),
})

export const createQuote = (input: NewQuote) => api.createQuote($state.snapshot(input))
export const setQuoteStatus = (id: string, estado: Quote['estado']) => api.updateQuoteStatus(id, estado)

// --- Pedidos ------------------------------------------------------------------

export const ordersStore = new LiveCollection<Order>(
  () => api.fetchOrders(),
  (event) => {
    if (event.type === 'order.created') {
      if (ordersStore.add(event.order)) ordersStore.flash('kpi')
    } else if (event.type === 'order.updated') {
      const order = ordersStore.patch(event.orderId, event.patch)
      if (order && event.patch.estado) {
        ordersStore.flash('kpi')
        if (event.patch.estado === 'entregado' || event.patch.estado === 'en_ruta') {
          toasts.push({
            tone: 'success',
            icon: event.patch.estado === 'entregado' ? 'check' : 'truck',
            title: `Pedido ${orderStatusLabel[event.patch.estado].toLowerCase()}`,
            message: `${order.numero} · ${order.cliente}`,
          })
        }
      }
    }
  },
)

export const orderTotals = () => ({
  total: ordersStore.items.length,
  enProceso: ordersStore.items.filter((o) => ORDERS_IN_PROCESS.includes(o.estado)).length,
  esteMes: ordersStore.items
    .filter((o) => sameMonth(o.fecha) && o.estado !== 'cancelado')
    .reduce((sum, o) => sum + o.valor, 0),
})

export const createOrder = (input: NewOrder) => api.createOrder($state.snapshot(input))
export const setOrderStatus = (id: string, estado: Order['estado']) => api.updateOrderStatus(id, estado)
