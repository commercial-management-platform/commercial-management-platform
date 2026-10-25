import { sameMonth } from '../domain/commerce'
import {
  addQuoteDetail,
  changeQuoteStatus,
  createQuote,
  getQuote,
  listQuotes,
  removeQuoteDetail,
  toDecimal,
  updateQuoteDetail,
  uploadQuoteDocument,
  type ApiQuote,
  type ApiQuoteDetail,
  type QuoteStatus,
} from '../services/quotesApi'
import {
  changeSalesOrderStatus,
  createSalesOrder,
  createSalesOrderFromQuote,
  listSalesOrders,
  type ApiSalesOrder,
  type SalesOrderStatus,
} from '../services/salesOrdersApi'
import type { LineItem } from '../types'
import { fetchAllPages, LiveCollection } from './liveCollection.svelte'

// --- Cotizaciones (HU-12, HU-13) ---------------------------------------------

export const quotesStore = new LiveCollection<ApiQuote>(
  () => fetchAllPages((page, limit) => listQuotes({ page, limit })),
  'No pudimos cargar las cotizaciones.',
)

export const quoteTotals = () => ({
  total: quotesStore.items.length,
  enProceso: quotesStore.items.filter((q) => q.status === 'draft' || q.status === 'sent').length,
  esteMes: quotesStore.items.filter((q) => sameMonth(`${q.date}T12:00:00`)).reduce((sum, q) => sum + Number(q.value), 0),
})

/** La cotización ya existe aunque falle algún producto: se completa desde su detalle. */
export class PartialQuoteError extends Error {
  constructor(
    readonly quote: ApiQuote,
    message: string,
  ) {
    super(message)
  }
}

/**
 * Crea la cotización en borrador y le agrega los productos uno a uno (el
 * backend recalcula el valor con cada uno). Si `send`, la envía al final.
 */
/** Visita donde se generó una cotización o un pedido (HU-09 CA-08): el formulario llega con estos datos fijos. */
export interface VisitOrigin {
  visitId: number
  clientId: number
  clientName: string
  advisorId: number
}

export async function createQuoteWithItems(input: {
  clientId: number
  date: string
  advisorId?: number
  visitId?: number
  items: LineItem[]
  send: boolean
}): Promise<ApiQuote> {
  let quote = await createQuote({ clientId: input.clientId, date: input.date, advisorId: input.advisorId, visitId: input.visitId })
  quotesStore.upsert(quote)
  try {
    for (const item of input.items) await addQuoteDetail(quote.id, toDetail(item))
    if (input.send) quote = await changeQuoteStatus(quote.id, 'sent')
    else quote = await getQuote(quote.id)
  } catch (error) {
    // Se refleja el valor parcial antes de informar.
    quotesStore.upsert(await getQuote(quote.id).catch(() => quote))
    throw new PartialQuoteError(quote, error instanceof Error ? error.message : 'Error de conexión')
  }
  quotesStore.upsert(quote)
  return quote
}

/**
 * Guarda los productos editados de una cotización en borrador: quita los que
 * ya no están, actualiza los cambiados y agrega los nuevos.
 */
export async function saveQuoteItems(quoteId: number, before: ApiQuoteDetail[], after: (LineItem & { detailId?: number })[]) {
  const kept = new Set(after.map((i) => i.detailId).filter((id) => id !== undefined))
  for (const detail of before) if (!kept.has(detail.id)) await removeQuoteDetail(quoteId, detail.id)
  for (const item of after) {
    const payload = toDetail(item)
    const original = before.find((d) => d.id === item.detailId)
    if (!original) await addQuoteDetail(quoteId, payload)
    else if (Number(original.quantity) !== item.cantidad || Number(original.price) !== item.precio)
      await updateQuoteDetail(quoteId, original.id, { quantity: payload.quantity, price: payload.price })
  }
  const quote = await getQuote(quoteId)
  quotesStore.upsert(quote)
  return quote
}

export async function setQuoteStatus(id: number, status: QuoteStatus) {
  const quote = await changeQuoteStatus(id, status)
  quotesStore.upsert(quote)
  return quote
}

export async function attachQuoteDocument(id: number, file: File) {
  const quote = await uploadQuoteDocument(id, file)
  quotesStore.upsert(quote)
  return quote
}

const toDetail = (item: LineItem) => ({
  product: item.producto.trim(),
  quantity: toDecimal(item.cantidad),
  price: toDecimal(item.precio),
})

/** Detalle del backend a línea editable (conserva el id para saber qué cambió). */
export const toLineItem = (detail: ApiQuoteDetail): LineItem & { detailId: number } => ({
  detailId: detail.id,
  producto: detail.product,
  cantidad: Number(detail.quantity),
  precio: Number(detail.price),
})

// --- Pedidos (HU-14) -------------------------------------------------------------

export const ordersStore = new LiveCollection<ApiSalesOrder>(
  () => fetchAllPages((page, limit) => listSalesOrders({ page, limit })),
  'No pudimos cargar los pedidos.',
)

export const orderTotals = () => ({
  total: ordersStore.items.length,
  enProceso: ordersStore.items.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
  esteMes: ordersStore.items
    .filter((o) => sameMonth(`${o.date}T12:00:00`) && o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.value), 0),
})

export async function createOrder(input: Parameters<typeof createSalesOrder>[0]) {
  const order = await createSalesOrder(input)
  ordersStore.upsert(order)
  return order
}

export async function createOrderFromQuote(quoteId: number, payload: Parameters<typeof createSalesOrderFromQuote>[1]) {
  const order = await createSalesOrderFromQuote(quoteId, payload)
  ordersStore.upsert(order)
  return order
}

export async function setOrderStatus(id: number, status: SalesOrderStatus) {
  const order = await changeSalesOrderStatus(id, status)
  ordersStore.upsert(order)
  return order
}
