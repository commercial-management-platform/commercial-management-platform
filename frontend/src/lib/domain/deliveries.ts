import type { Delivery } from '../types'

/** Reasigna estados según el orden de la cola: la primera va en camino, la segunda es la siguiente. */
export function promoteQueue(queue: Delivery[]): void {
  queue.forEach((delivery, i) => {
    delivery.status = i === 0 ? 'en_camino' : i === 1 ? 'siguiente' : 'programado'
  })
}

/** Minutos restantes estimados para completar el tramo. */
export const remainingMinutes = (delivery: Delivery) => Math.max(0, Math.round((1 - delivery.progress) * delivery.duracion))
