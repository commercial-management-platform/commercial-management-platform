import type { OrderStatus, QuoteStatus } from '../../lib/types'

/** Variante de la clase global `.badge` según el estado. */
export const quoteBadge: Record<QuoteStatus, string> = {
  borrador: 'neutral',
  enviada: '',
  en_revision: 'deep',
  aprobada: 'deep',
  rechazada: 'danger',
}

export const orderBadge: Record<OrderStatus, string> = {
  confirmado: '',
  preparando: 'deep',
  en_ruta: 'deep',
  entregado: '',
  cancelado: 'danger',
}
