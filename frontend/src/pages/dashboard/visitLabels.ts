import type { VisitStatus } from '../../lib/types'

export const visitStatusLabel: Record<VisitStatus, string> = {
  pendiente: 'Pendiente',
  visitado: 'Visitado',
  reprogramado: 'Reprogramado',
  sin_visitar: 'Sin visitar',
}
