import type { LineItem, OrderStatus } from '../types'

/** Productos sugeridos al cotizar, con precio de lista. El backend acepta cualquier nombre. */
export const PRODUCTOS: { nombre: string; precio: number }[] = [
  { nombre: 'Lámina galvanizada cal. 22', precio: 185 },
  { nombre: 'Tubo estructural 2"', precio: 96 },
  { nombre: 'Perfil en C 4"', precio: 142 },
  { nombre: 'Pintura epóxica (galón)', precio: 64 },
  { nombre: 'Soldadura E6013 (kg)', precio: 12 },
  { nombre: 'Malla electrosoldada', precio: 210 },
  { nombre: 'Tornillería surtida (caja)', precio: 38 },
  { nombre: 'Cable THHN #12 (rollo)', precio: 118 },
]

/** Flujo de pedidos del servidor simulado (dashboard); "cancelado" queda fuera. */
const ORDER_FLOW: OrderStatus[] = ['confirmado', 'preparando', 'en_ruta', 'entregado']

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(status)
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null
}

export const subtotal = (item: LineItem) => item.cantidad * item.precio
export const total = (items: LineItem[]) => items.reduce((sum, item) => sum + subtotal(item), 0)

export const sameMonth = (iso: string, now = new Date()) => {
  const d = new Date(iso)
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

/** Reparte un valor objetivo en líneas de producto plausibles (para cotizaciones generadas). */
export function itemsForValue(target: number, rand: () => number = Math.random): LineItem[] {
  const count = 1 + Math.floor(rand() * 3)
  const picked = [...PRODUCTOS].sort(() => rand() - 0.5).slice(0, count)
  const share = target / count
  const items = picked.map((p) => ({ producto: p.nombre, precio: p.precio, cantidad: Math.max(1, Math.round(share / p.precio)) }))
  // La última línea ajusta su precio para que el total quede cerca del valor objetivo.
  const last = items[items.length - 1]
  const rest = total(items) - subtotal(last)
  if (target > rest) last.precio = Math.max(1, Math.round((target - rest) / last.cantidad))
  return items
}
