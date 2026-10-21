import { promoteQueue } from '../domain/deliveries'
import { api } from '../services/api'
import type { Client, Delivery, LatLng, LiveEvent, Period, Stats, VisitRow } from '../types'
import { formatMoney } from '../utils/format'
import { toasts } from './toasts.svelte'

const PERIODS: Period[] = ['semana', 'mes', 'trimestre']
const MAX_ROWS = 60
const HIGHLIGHT_MS = 2400

const emptyStats = (): Stats => ({
  visitasRealizadas: 0,
  visitasProgramadas: 0,
  metaVisitas: 0,
  valorCotizado: 0,
  valorCotizadoPrev: 0,
  pedidosCerrados: 0,
  pedidosCerradosPrev: 0,
  facturacion: 0,
  facturacionPrev: 0,
})

/**
 * Estado del dashboard alimentado en tiempo real.
 * Carga una foto inicial y luego aplica cada LiveEvent que llega del servidor.
 */
class DashboardStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  live = $state(false)
  lastEventAt = $state<number | null>(null)

  period = $state<Period>('semana')
  query = $state('')

  stats = $state<Record<Period, Stats>>({ semana: emptyStats(), mes: emptyStats(), trimestre: emptyStats() })
  visits = $state<VisitRow[]>([])
  deliveries = $state<Delivery[]>([])
  clients = $state<Client[]>([])
  depot = $state<LatLng>([0, 0])

  /** Ids de filas/tarjetas que acaban de cambiar, para resaltarlas. */
  highlights = $state<Record<string, boolean>>({})
  selectedDeliveryId = $state<string | null>(null)

  current = $derived(this.stats[this.period])
  weekly = $derived(this.stats.semana)
  activeDelivery = $derived(this.deliveries.find((d) => d.status === 'en_camino') ?? null)
  selectedDelivery = $derived(
    this.deliveries.find((d) => d.id === this.selectedDeliveryId) ?? this.activeDelivery,
  )

  #unsubscribe: (() => void) | null = null

  #connecting = false

  /** Trae la foto actual (también al reanudar, para no perder lo ocurrido en pausa) y se suscribe. */
  async connect() {
    if (this.#unsubscribe || this.#connecting) return
    this.#connecting = true
    if (this.status !== 'ready') this.status = 'loading'
    try {
      const snapshot = await api.fetchDashboard()
      this.stats = snapshot.stats
      this.visits = snapshot.visits
      this.deliveries = snapshot.deliveries
      this.clients = snapshot.clients
      this.depot = snapshot.depot
      this.status = 'ready'
      this.#unsubscribe = api.subscribe((event) => this.#apply(event))
      this.live = true
    } catch {
      this.status = 'error'
    } finally {
      this.#connecting = false
    }
  }

  disconnect() {
    this.#unsubscribe?.()
    this.#unsubscribe = null
    this.live = false
  }

  toggleLive() {
    if (this.live) this.disconnect()
    else this.connect()
  }

  selectDelivery(id: string) {
    this.selectedDeliveryId = id
  }

  scheduleVisit(input: { clientId: string; fecha: string; observacion?: string }) {
    // La fila aparece cuando el servidor emite 'visit.scheduled'.
    return api.scheduleVisit(input)
  }

  #flash(key: string) {
    this.highlights[key] = true
    setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
  }

  /** Los eventos de hoy cuentan para semana, mes y trimestre. */
  #bump(changes: Partial<Record<keyof Stats, number>>) {
    for (const period of PERIODS) {
      for (const [key, amount] of Object.entries(changes)) {
        this.stats[period][key as keyof Stats] += amount
      }
    }
    Object.keys(changes).forEach((key) => this.#flash(`kpi:${key}`))
  }

  #apply(event: LiveEvent) {
    this.lastEventAt = Date.now()

    switch (event.type) {
      case 'visit.scheduled': {
        this.visits = [event.visit, ...this.visits].slice(0, MAX_ROWS)
        this.#bump({ visitasProgramadas: 1 })
        this.#flash(event.visit.id)
        toasts.push({
          tone: 'info',
          icon: 'calendar',
          title: 'Nueva visita programada',
          message: `${event.visit.cliente} · ${event.visit.municipio}`,
        })
        break
      }

      case 'visit.completed': {
        const visit = this.visits.find((v) => v.id === event.visitId)
        if (!visit) break
        visit.estado = 'visitado'
        visit.resultado = event.resultado
        visit.cotizacion = event.cotizacion
        this.#bump({ visitasRealizadas: 1, ...(event.cotizacion ? { valorCotizado: event.cotizacion } : {}) })
        this.#flash(visit.id)
        toasts.push({
          tone: 'success',
          icon: 'check',
          title: 'Visita realizada',
          message: event.cotizacion
            ? `${visit.cliente} · cotización ${formatMoney(event.cotizacion)}`
            : `${visit.cliente} · ${event.resultado}`,
        })
        break
      }

      case 'visit.rescheduled': {
        const visit = this.visits.find((v) => v.id === event.visitId)
        if (!visit) break
        visit.estado = 'reprogramado'
        visit.resultado = 'No visitado'
        this.#flash(visit.id)
        break
      }

      case 'order.closed': {
        this.#bump({ pedidosCerrados: 1, facturacion: event.valor })
        toasts.push({
          tone: 'success',
          icon: 'package',
          title: 'Pedido cerrado',
          message: `${event.cliente} · ${formatMoney(event.valor)}`,
        })
        break
      }

      case 'delivery.position': {
        const delivery = this.deliveries.find((d) => d.id === event.deliveryId)
        if (delivery) delivery.progress = event.progress
        break
      }

      case 'delivery.delivered': {
        const delivered = this.deliveries.find((d) => d.id === event.deliveryId)
        this.deliveries = this.deliveries.filter((d) => d.id !== event.deliveryId)
        promoteQueue(this.deliveries)
        if (this.selectedDeliveryId === event.deliveryId) this.selectedDeliveryId = null
        if (delivered) {
          toasts.push({
            tone: 'success',
            icon: 'truck',
            title: 'Entrega completada',
            message: `${delivered.pedido} · ${delivered.cliente}`,
          })
        }
        break
      }

      case 'delivery.created': {
        this.deliveries.push(event.delivery)
        promoteQueue(this.deliveries)
        this.#flash(event.delivery.id)
        break
      }

      // Visita registrada desde el formulario sin haber estado programada.
      case 'visit.registered': {
        const { visit } = event
        this.visits = [visit, ...this.visits].slice(0, MAX_ROWS)
        this.#flash(visit.id)
        if (visit.estado === 'visitado') {
          this.#bump({
            visitasRealizadas: 1,
            visitasProgramadas: 1,
            ...(visit.cotizacion ? { valorCotizado: visit.cotizacion } : {}),
          })
          toasts.push({
            tone: 'success',
            icon: 'check',
            title: 'Visita registrada',
            message: `${visit.cliente} · ${visit.resultado}`,
          })
        }
        break
      }

      // La lista de clientes se usa en "Registrar visita".
      case 'client.created': {
        this.clients.push(event.client)
        break
      }

      case 'client.updated': {
        const client = this.clients.find((c) => c.id === event.clientId)
        if (client) Object.assign(client, event.patch)
        break
      }
    }
  }
}

export const dashboard = new DashboardStore()
