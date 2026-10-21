import { itemsForValue, total } from '../../domain/commerce'
import type { Order, OrderStatus, Quote, QuoteStatus } from '../../types'
import { ASESORES, CLIENTS } from './seed'

// Cotizaciones y pedidos de ejemplo de los últimos dos meses.

function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
}

function daysFromNow(days: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const client = (id: string) => CLIENTS.find((c) => c.id === id)!

/** Las cuatro más recientes replican el diseño; el resto se genera. */
const RECENT_QUOTES: [string, QuoteStatus, number, number, number][] = [
  // [cliente, estado, vigencia, valor objetivo, hace N días]
  ['c1', 'enviada', 15, 24_800, 0],
  ['c2', 'borrador', 30, 18_500, 1],
  ['c3', 'aprobada', 15, 12_600, 3],
  ['c4', 'en_revision', 30, 31_200, 7],
]

export const QUOTE_COUNT = 36
export const FIRST_QUOTE_NUMBER = 1248

export function createQuotesSeed(): Quote[] {
  const rand = seeded(11)
  const older: QuoteStatus[] = ['aprobada', 'aprobada', 'rechazada', 'en_revision', 'enviada', 'aprobada', 'borrador']
  return Array.from({ length: QUOTE_COUNT }, (_, i) => {
    const recent = RECENT_QUOTES[i]
    const c = recent ? client(recent[0]) : CLIENTS[Math.floor(rand() * CLIENTS.length)]
    const valor = recent ? recent[3] : Math.round((4_000 + rand() * 30_000) / 100) * 100
    const items = itemsForValue(valor, rand)
    return {
      id: `q${FIRST_QUOTE_NUMBER - i}`,
      numero: `COT-${FIRST_QUOTE_NUMBER - i}`,
      clientId: c.id,
      cliente: c.nombre,
      asesorId: ASESORES[i % ASESORES.length].id,
      fecha: daysFromNow(-(recent ? recent[4] : 8 + Math.floor(i * 1.6)), 9 + (i % 8)),
      vigenciaDias: recent ? recent[2] : [15, 30, 45][i % 3],
      valor: total(items),
      estado: recent ? recent[1] : older[i % older.length],
      items,
    }
  })
}

const RECENT_ORDERS: [string, OrderStatus, number, number, number][] = [
  // [cliente, estado, valor objetivo, creado hace N días, entrega en N días]
  ['c1', 'en_ruta', 18_500, 0, 2],
  ['c2', 'preparando', 12_600, 1, 6],
  ['c3', 'entregado', 9_800, 3, -1],
  ['c4', 'confirmado', 21_300, 7, 3],
]

export const ORDER_COUNT = 30
export const FIRST_ORDER_NUMBER = 568

export function createOrdersSeed(quotes: Quote[]): Order[] {
  const rand = seeded(23)
  const approved = quotes.filter((q) => q.estado === 'aprobada')
  return Array.from({ length: ORDER_COUNT }, (_, i) => {
    const recent = RECENT_ORDERS[i]
    // Algunos pedidos provienen de una cotización aprobada.
    const quote = !recent && i % 3 === 0 ? approved[i % approved.length] : undefined
    const c = recent ? client(recent[0]) : quote ? client(quote.clientId) : CLIENTS[Math.floor(rand() * CLIENTS.length)]
    const items = quote ? quote.items : itemsForValue(recent ? recent[2] : 3_000 + rand() * 25_000, rand)
    const createdAgo = recent ? recent[3] : 9 + Math.floor(i * 1.8)
    const entregaIn = recent ? recent[4] : -createdAgo + 5 + Math.floor(rand() * 6)
    const estado: OrderStatus = recent ? recent[1] : i % 11 === 0 ? 'cancelado' : entregaIn < 0 ? 'entregado' : 'preparando'
    return {
      id: `o${FIRST_ORDER_NUMBER - i}`,
      numero: `PED-${FIRST_ORDER_NUMBER - i}`,
      clientId: c.id,
      cliente: c.nombre,
      quoteId: quote?.id,
      fecha: daysFromNow(-createdAgo, 8 + (i % 9)),
      entrega: daysFromNow(entregaIn, 14),
      valor: total(items),
      estado,
      items,
    }
  })
}
