import type { QuoteStatus } from '../../lib/services/quotesApi'
import type { SalesOrderStatus } from '../../lib/services/salesOrdersApi'

/** Variante de la clase global `.badge` según el estado. */
export const quoteBadge: Record<QuoteStatus, string> = {
  draft: 'neutral',
  sent: '',
  approved: 'deep',
  rejected: 'danger',
}

export const orderBadge: Record<SalesOrderStatus, string> = {
  pending: 'neutral',
  confirmed: '',
  delivered: 'deep',
  cancelled: 'danger',
}
