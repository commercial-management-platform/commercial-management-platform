import { untrack } from 'svelte'
import { weekRange } from '../domain/tracking'
import { getDashboardKpis, type DashboardKpis } from '../services/dashboardApi'
import { ApiError } from '../services/http'
import { listRoutes, type ApiRoute } from '../services/routesApi'
import { clientDisplayName } from '../services/clientsApi'
import { businessToday, getVisitForm, listVisits, type ApiVisit } from '../services/visitsApi'
import { clientDirectory } from './clientDirectory.svelte'
import { dashboard } from './dashboard.svelte'
import { fetchAllPages } from './liveCollection.svelte'
import { session } from './session.svelte'

/** Lo que el dashboard muestra del cliente de una visita. */
export interface VisitClient {
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
}

/** El backend aún no emite eventos: mientras "En vivo" esté activo se consulta cada 30 s. */
const POLL_MS = 30_000
const HIGHLIGHT_MS = 2400

/**
 * Operación comercial de una semana para el dashboard (HU-15) y el mapa (HU-11):
 * los indicadores que calcula el backend y las visitas (para el mapa y la agenda)
 * con los filtros de semana, zona y asesor. El backend limita al asesor a lo suyo.
 */
class OperationStore {
  /** Cualquier día de la semana consultada (YYYY-MM-DD). */
  week = $state(businessToday())
  advisorId = $state<number | ''>('')
  zoneId = $state<number | ''>('')

  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  error = $state('')
  kpis = $state<DashboardKpis | null>(null)
  visits = $state<ApiVisit[]>([])
  routes = $state<ApiRoute[]>([])
  updatedAt = $state<Date | null>(null)
  highlights = $state<Record<string, boolean>>({})

  /**
   * Clientes de visitas que /clients no devuelve: el gestor puede programar al asesor
   * una visita a un cliente fuera de sus rutas. Se completan con /visits/:id/form.
   */
  extraClients = $state<Record<number, VisitClient>>({})

  range = $derived(weekRange(this.week))
  routeById = $derived(new Map(this.routes.map((r) => [r.id, r])))

  #timer: ReturnType<typeof setInterval> | null = null
  #requested = new Set<number>()
  #request = 0
  #owner: string | null = null

  async refresh() {
    const owner = session.current?.user.id ?? null
    if (owner !== this.#owner) {
      this.#owner = owner
      this.visits = []
      this.kpis = null
      this.extraClients = {}
      this.#requested.clear()
      this.status = 'idle'
    }
    const current = ++this.#request
    if (this.status !== 'ready') this.status = 'loading'
    const filters = {
      week: this.week,
      advisorId: this.advisorId === '' ? undefined : this.advisorId,
      zoneId: this.zoneId === '' ? undefined : this.zoneId,
    }
    try {
      const [kpis, visits, routes] = await Promise.all([
        getDashboardKpis(filters),
        fetchAllPages((page, limit) => listVisits({ ...filters, page, limit })),
        listRoutes().catch(() => this.routes),
      ])
      if (current !== this.#request) return
      if (this.status === 'ready') this.#flashChanges(visits)
      this.kpis = kpis
      this.visits = visits
      this.routes = routes
      this.updatedAt = new Date()
      this.status = 'ready'
      this.error = ''
    } catch (error) {
      if (current !== this.#request) return
      this.error = error instanceof ApiError ? error.message : 'No pudimos cargar la operación comercial.'
      if (this.status !== 'ready') this.status = 'error'
    }
  }

  /** Cliente de una visita: el del directorio o, si no está, el del formulario de la visita. */
  client(visit: ApiVisit): VisitClient | null {
    const client = clientDirectory.byId.get(visit.clientId)
    if (client) return { ...client, name: clientDisplayName(client) }
    return this.extraClients[visit.clientId] ?? null
  }

  async #loadMissingClients() {
    if (clientDirectory.status !== 'ready') return
    const missing = new Map<number, number>()
    for (const v of this.visits) {
      if (!clientDirectory.byId.has(v.clientId) && !this.#requested.has(v.clientId)) missing.set(v.clientId, v.id)
    }
    await Promise.all(
      [...missing].map(async ([clientId, visitId]) => {
        this.#requested.add(clientId)
        try {
          const { client } = await getVisitForm(visitId)
          this.extraClients[clientId] = {
            name: client.tradeName || client.businessName,
            address: client.address,
            latitude: client.latitude,
            longitude: client.longitude,
          }
        } catch {
          this.#requested.delete(clientId)
        }
      }),
    )
  }

  /** Cambia un filtro: se muestra la carga en lugar de los datos de la semana anterior. */
  reload() {
    this.status = 'loading'
    this.refresh()
  }

  #flashChanges(next: ApiVisit[]) {
    const previous = new Map(this.visits.map((v) => [v.id, v.updatedAt]))
    for (const visit of next) {
      if (previous.get(visit.id) !== visit.updatedAt) {
        const key = String(visit.id)
        this.highlights[key] = true
        setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
      }
    }
  }

  /** Consulta periódica mientras el componente esté montado; respeta la pausa global. */
  use() {
    $effect(() => {
      void [this.week, this.advisorId, this.zoneId]
      untrack(() => this.reload())
    })
    $effect(() => {
      void [this.visits, clientDirectory.status]
      untrack(() => this.#loadMissingClients())
    })
    $effect(() => {
      if (!dashboard.live) return
      untrack(() => (this.#timer ??= setInterval(() => this.refresh(), POLL_MS)))
      return () => {
        if (this.#timer) clearInterval(this.#timer)
        this.#timer = null
      }
    })
  }
}

export const operation = new OperationStore()

/**
 * Objetivo semanal de la barra lateral: visitas realizadas frente a las programadas
 * (sin canceladas) de la semana en curso, con los indicadores del backend.
 */
class WeeklyGoalStore {
  scheduled = $state(0)
  visited = $state(0)
  highlight = $state(false)

  #timer: ReturnType<typeof setInterval> | null = null

  async refresh() {
    try {
      const { current } = await getDashboardKpis()
      if (current.completedVisits !== this.visited && this.scheduled > 0) {
        this.highlight = true
        setTimeout(() => (this.highlight = false), HIGHLIGHT_MS)
      }
      this.scheduled = current.scheduledVisits
      this.visited = current.completedVisits
    } catch {
      // Se conservan los últimos valores; la barra lateral no muestra errores.
    }
  }

  use() {
    $effect(() => {
      void session.current?.user.id
      untrack(() => this.refresh())
      if (!dashboard.live) return
      untrack(() => (this.#timer ??= setInterval(() => this.refresh(), POLL_MS)))
      return () => {
        if (this.#timer) clearInterval(this.#timer)
        this.#timer = null
      }
    })
  }
}

export const weeklyGoal = new WeeklyGoalStore()
