import { untrack } from 'svelte'
import { DIAS, splitDays, weekStatus, type WeekStatus } from '../domain/routes'
import { can } from '../permissions.svelte'
import { listAdvisors, type ApiAdvisor } from '../services/advisorsApi'
import { listClients, type ApiClient } from '../services/clientsApi'
import { ApiError } from '../services/http'
import {
  addRouteClient,
  listRouteClients,
  listRoutes,
  removeRouteClient,
  reorderRouteClients,
  updateRoute,
  type ApiRoute,
  type RoutePayload,
} from '../services/routesApi'
import { businessToday, listVisits, type ApiVisit } from '../services/visitsApi'
import { percent } from '../utils/format'
import { catalogs } from './catalogs.svelte'
import { dashboard } from './dashboard.svelte'
import { session } from './session.svelte'

/** El backend aún no emite eventos: mientras "En vivo" esté activo se consulta cada 30 s. */
const POLL_MS = 30_000
const HIGHLIGHT_MS = 2400
/** Máximo que acepta el backend por página. */
const VISITS_PAGE = 100

/** Ruta del backend con sus clientes y el avance de sus visitas en la semana actual. */
export interface RouteRow {
  route: ApiRoute
  /** En orden de visita. */
  clientIds: number[]
  dias: string[]
  /** Visitas de la semana no canceladas, y cuántas ya se hicieron. */
  programadas: number
  realizadas: number
  estado: WeekStatus
}

export interface AdvisorStats {
  advisor: ApiAdvisor
  rutas: number
  /** Zonas de sus rutas activas. */
  zonas: string[]
  realizadas: number
  meta: number
  cumplimiento: number
}

/**
 * Rutas (HU-07) y su avance en la semana según las visitas (HU-08). Admin y
 * director ven todas; el asesor solo las suyas.
 */
class RoutesStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  error = $state('')
  routes = $state<ApiRoute[]>([])
  clientIdsByRoute = $state<Record<number, number[]>>({})
  /** Visitas de la semana actual (de lunes a domingo). */
  visits = $state<ApiVisit[]>([])
  /** Solo para el gestor: GET /advisors responde 403 al asesor. */
  advisors = $state<ApiAdvisor[]>([])
  clients = $state<ApiClient[]>([])
  updatedAt = $state<Date | null>(null)
  highlights = $state<Record<string, boolean>>({})

  clientById = $derived(new Map(this.clients.map((c) => [c.id, c])))
  advisorById = $derived(new Map(this.advisors.map((a) => [a.id, a])))

  rows = $derived<RouteRow[]>(
    this.routes.map((route) => {
      const own = this.visits.filter((v) => v.routeId === route.id && v.status !== 'cancelled')
      const realizadas = own.filter((v) => v.status === 'visited').length
      return {
        route,
        clientIds: this.clientIdsByRoute[route.id] ?? [],
        dias: splitDays(route.executionDays),
        programadas: own.length,
        realizadas,
        estado: weekStatus(route.status === 'active', realizadas, own.length),
      }
    }),
  )

  totals = $derived({
    // Una ruta completada esta semana ya no cuenta como activa.
    activas: this.routes.filter((r) => r.status === 'active').length - this.rows.filter((r) => r.estado === 'completada').length,
    completadas: this.rows.filter((r) => r.estado === 'completada').length,
    /** Visitas de la semana que siguen pendientes. */
    visitasProgramadas: this.visits.filter((v) => v.status === 'scheduled').length,
  })

  /**
   * Cumplimiento por asesor en la semana: visitas hechas frente a las que ya
   * debían hacerse (hasta hoy). Las de días futuros no penalizan.
   */
  stats = $derived.by<AdvisorStats[]>(() => {
    const endOfToday = Date.parse(`${businessToday()}T23:59:59-05:00`)
    return this.advisors.map((advisor) => {
      const active = this.routes.filter((r) => r.advisorId === advisor.id && r.status === 'active')
      const due = this.visits.filter(
        (v) => v.advisorId === advisor.id && v.status !== 'cancelled' && Date.parse(v.scheduledDate) <= endOfToday,
      )
      const realizadas = due.filter((v) => v.status === 'visited').length
      return {
        advisor,
        rutas: active.length,
        zonas: [...new Set(active.map((r) => catalogs.name('zones', r.zoneId)).filter(Boolean))],
        realizadas,
        meta: due.length,
        cumplimiento: percent(realizadas, due.length),
      }
    })
  })

  #timer: ReturnType<typeof setInterval> | null = null
  #loading = false
  #owner: string | null = null

  async refresh() {
    if (this.#loading) return
    // Si cambió el usuario (otro inicio de sesión), no se muestran datos del anterior.
    const owner = session.current?.user.id ?? null
    if (owner !== this.#owner) {
      this.#owner = owner
      this.routes = []
      this.clientIdsByRoute = {}
      this.visits = []
      this.advisors = []
      this.status = 'idle'
    }
    this.#loading = true
    if (this.status !== 'ready') this.status = 'loading'
    try {
      const [routes, clients, visits, advisors] = await Promise.all([
        listRoutes(),
        listClients(),
        weekVisits(),
        // Inactivos incluidos: sus rutas antiguas siguen mostrando el nombre.
        can.manageRoutes ? listAdvisors(true) : Promise.resolve([]),
        catalogs.load(),
      ])
      // Una consulta por ruta: el backend no devuelve los clientes en el listado.
      const lists = await Promise.all(routes.map((r) => listRouteClients(r.id)))
      if (this.status === 'ready') this.#flashChanges(routes)
      this.routes = routes
      this.clientIdsByRoute = Object.fromEntries(routes.map((r, i) => [r.id, lists[i].map((rc) => rc.clientId)]))
      this.clients = clients
      this.visits = visits
      this.advisors = advisors
      this.updatedAt = new Date()
      this.status = 'ready'
      this.error = ''
    } catch (error) {
      // Si ya había datos se conservan; solo se informa el problema.
      this.error = error instanceof ApiError ? error.message : 'No pudimos cargar las rutas.'
      if (this.status !== 'ready') this.status = 'error'
    } finally {
      this.#loading = false
    }
  }

  start() {
    this.refresh()
    this.#timer ??= setInterval(() => this.refresh(), POLL_MS)
  }

  stop() {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = null
  }

  flash(key: string) {
    this.highlights[key] = true
    setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
  }

  advisorName(advisorId: number) {
    if (can.isAdvisor) return session.current?.user.name ?? 'Tú'
    return this.advisorById.get(advisorId)?.name ?? `Asesor #${advisorId}`
  }

  // --- Gestión (solo admin y director) -------------------------------------

  async update(routeId: number, payload: Partial<RoutePayload>) {
    const route = await updateRoute(routeId, payload)
    this.routes = this.routes.map((r) => (r.id === route.id ? route : r))
    this.flash(String(route.id))
    return route
  }

  async addClient(routeId: number, clientId: number) {
    await addRouteClient(routeId, clientId)
    await this.#reloadClients(routeId)
  }

  async removeClient(routeId: number, clientId: number) {
    await removeRouteClient(routeId, clientId)
    await this.#reloadClients(routeId)
  }

  /** Mueve un cliente de posición y guarda el orden completo. */
  async moveClient(routeId: number, from: number, to: number) {
    const ids = [...(this.clientIdsByRoute[routeId] ?? [])]
    if (to < 0 || to >= ids.length || from === to) return
    const [id] = ids.splice(from, 1)
    ids.splice(to, 0, id)
    const previous = this.clientIdsByRoute[routeId]
    // Se muestra el cambio de inmediato y se revierte si el backend lo rechaza.
    this.clientIdsByRoute[routeId] = ids
    try {
      await reorderRouteClients(routeId, ids)
    } catch (error) {
      this.clientIdsByRoute[routeId] = previous
      throw error
    }
  }

  async #reloadClients(routeId: number) {
    const list = await listRouteClients(routeId)
    this.clientIdsByRoute[routeId] = list.map((rc) => rc.clientId)
  }

  #flashChanges(next: ApiRoute[]) {
    const previous = new Map(this.routes.map((r) => [r.id, JSON.stringify(r)]))
    for (const route of next) {
      if (previous.get(route.id) !== JSON.stringify(route)) this.flash(String(route.id))
    }
  }
}

/** Todas las visitas de la semana actual; el backend pagina de a 100. */
async function weekVisits(): Promise<ApiVisit[]> {
  const week = businessToday()
  const first = await listVisits({ week, page: 1, limit: VISITS_PAGE })
  const pages = Math.ceil(first.total / VISITS_PAGE)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => listVisits({ week, page: i + 2, limit: VISITS_PAGE })),
  )
  return [first, ...rest].flatMap((p) => p.data)
}

/** Primer día de ejecución en la semana, para ordenar (las rutas sin días van al final). */
export const firstDayIndex = (dias: string[]) => Math.min(...dias.map((d) => DIAS.indexOf(d)).filter((i) => i >= 0), 99)

export const routesStore = new RoutesStore()

/** Consulta periódica mientras el componente esté montado y "En vivo" esté activo. */
export function useLiveRoutes() {
  $effect(() => {
    if (!dashboard.live) {
      // En pausa: una sola carga para no dejar la pantalla vacía.
      untrack(() => routesStore.status === 'idle' && routesStore.refresh())
      return
    }
    untrack(() => routesStore.start())
    return () => routesStore.stop()
  })
}
