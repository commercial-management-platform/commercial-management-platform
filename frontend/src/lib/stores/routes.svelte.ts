import { untrack } from 'svelte'
import { DIAS, applyProgress, todayIndex } from '../domain/routes'
import { api } from '../services/api'
import type { Asesor, AssignedRoute, Client, LiveEvent } from '../types'
import { percent } from '../utils/format'
import { dashboard } from './dashboard.svelte'
import { toasts } from './toasts.svelte'

const HIGHLIGHT_MS = 2400

export interface AsesorStats {
  asesor: Asesor
  rutas: number
  realizadas: number
  meta: number
  cumplimiento: number
}

/**
 * Rutas asignadas de la semana y carga de cada asesor.
 * Igual que el dashboard: foto inicial + eventos en tiempo real.
 */
class RoutesStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  routes = $state<AssignedRoute[]>([])
  asesores = $state<Asesor[]>([])
  clients = $state<Client[]>([])
  highlights = $state<Record<string, boolean>>({})

  clientById = $derived(new Map(this.clients.map((c) => [c.id, c])))
  asesorById = $derived(new Map(this.asesores.map((a) => [a.id, a])))

  totals = $derived({
    activas: this.routes.filter((r) => r.estado !== 'completada').length,
    completadas: this.routes.filter((r) => r.estado === 'completada').length,
    /** Visitas aún pendientes en las rutas activas. */
    visitasProgramadas: this.routes
      .filter((r) => r.estado !== 'completada')
      .reduce((sum, r) => sum + r.stops.length - r.completadas, 0),
  })

  /**
   * Cumplimiento por asesor a la fecha: paradas visitadas frente a las que ya
   * debían visitarse (rutas de días anteriores y de hoy). Las de días futuros no penalizan.
   */
  stats = $derived<AsesorStats[]>(
    this.asesores.map((asesor) => {
      const own = this.routes.filter((r) => r.asesorId === asesor.id)
      const due = own.filter((r) => DIAS.indexOf(r.dia) <= todayIndex())
      const meta = due.reduce((sum, r) => sum + r.stops.length, 0)
      const realizadas = due.reduce((sum, r) => sum + r.completadas, 0)
      return { asesor, rutas: own.length, realizadas, meta, cumplimiento: percent(realizadas, meta) }
    }),
  )

  #unsubscribe: (() => void) | null = null
  #connecting = false

  async connect() {
    if (this.#unsubscribe || this.#connecting) return
    this.#connecting = true
    if (this.status !== 'ready') this.status = 'loading'
    try {
      const snapshot = await api.fetchRoutes()
      this.routes = snapshot.routes
      this.asesores = snapshot.asesores
      this.clients = snapshot.clients
      this.status = 'ready'
      this.#unsubscribe = api.subscribe((event) => this.#apply(event))
    } catch {
      this.status = 'error'
    } finally {
      this.#connecting = false
    }
  }

  disconnect() {
    this.#unsubscribe?.()
    this.#unsubscribe = null
  }

  flash(key: string) {
    this.highlights[key] = true
    setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
  }

  #apply(event: LiveEvent) {
    switch (event.type) {
      case 'route.created': {
        if (this.routes.some((r) => r.id === event.route.id)) break
        this.routes = [event.route, ...this.routes]
        this.flash(event.route.id)
        this.flash(`asesor:${event.route.asesorId}`)
        break
      }
      case 'route.progress': {
        const route = this.routes.find((r) => r.id === event.routeId)
        if (!route) break
        applyProgress(route, event.completadas)
        this.flash(route.id)
        this.flash(`asesor:${route.asesorId}`)
        if (route.estado === 'completada') {
          toasts.push({
            tone: 'success',
            icon: 'check',
            title: 'Ruta completada',
            message: `${route.nombre} · ${this.asesorById.get(route.asesorId)?.nombre ?? ''}`,
          })
        }
        break
      }
    }
  }
}

export const routesStore = new RoutesStore()

/**
 * Mantiene la conexión en vivo mientras el componente que lo llama esté montado,
 * respetando la pausa global ("En vivo" / "En pausa") de la barra superior.
 */
export function useLiveRoutes() {
  $effect(() => {
    if (!dashboard.live) return
    // untrack: connect() lee `status`; sin esto el efecto se re-ejecutaría al terminar de cargar.
    untrack(() => routesStore.connect())
    return () => routesStore.disconnect()
  })
}
