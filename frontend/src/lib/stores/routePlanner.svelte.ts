import { DEPOT, joinDays, suggestRouteName, zoneCode, type PlanClient, type RouteInfo, type RouteStop } from '../domain/routes'
import { listAdvisors, type ApiAdvisor } from '../services/advisorsApi'
import { clientDisplayName, listClients } from '../services/clientsApi'
import { ApiError } from '../services/http'
import { addRouteClient, createRoute, listRoutes, type ApiRoute } from '../services/routesApi'
import { businessToday } from '../services/visitsApi'
import { estimateLeg, getRouteThrough } from '../services/routing'
import type { LatLng, RouteLeg } from '../types'
import { toMinutes } from '../utils/format'
import { catalogs } from './catalogs.svelte'

const DRAFT_KEY = 'kestrel.route-draft.v2'
const DEFAULT_VISIT_MINUTES = 30
export const MIN_STOPS = 2

export { DIAS, FRECUENCIAS } from '../domain/routes'

const emptyInfo = (): RouteInfo => ({
  nombre: '',
  zoneId: '',
  dias: [],
  frecuencia: 'Semanal',
  horaInicio: '08:00',
  horaFin: '12:00',
  descripcion: '',
  inicio: businessToday(),
})

/** Asesor con su carga actual (para elegir a quién asignar una ruta). */
export interface AdvisorLoad extends ApiAdvisor {
  rutasActivas: number
}

interface Draft {
  info: RouteInfo
  stops: RouteStop[]
  advisorId: number | ''
}

export interface ScheduledStop extends RouteStop {
  client: PlanClient
  /** Minutos desde la medianoche. */
  llegada: number
  salida: number
  /** Tramo desde la parada anterior (o la bodega). */
  leg: RouteLeg
}

/** La ruta se creó pero algunos clientes no se pudieron asociar. */
export class PartialRouteError extends Error {
  constructor(
    readonly route: ApiRoute,
    readonly missing: number,
    message: string,
  ) {
    super(message)
  }
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

/** Solo los clientes activos con coordenadas se pueden ubicar en el recorrido. */
function toPlanClient(client: Awaited<ReturnType<typeof listClients>>[number]): PlanClient | null {
  if (!client.active || client.latitude === null || client.longitude === null) return null
  return {
    id: client.id,
    nombre: clientDisplayName(client),
    direccion: client.address ?? '',
    municipio: client.municipality ?? 'Sin municipio',
    tipo: catalogs.name('clientTypes', client.clientTypeId) || 'Sin tipo',
    zoneId: client.zoneId,
    coords: [client.latitude, client.longitude],
  }
}

class RoutePlanner {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  error = $state('')
  clients = $state<PlanClient[]>([])
  advisors = $state<AdvisorLoad[]>([])
  depot: LatLng = DEPOT
  /** Nombres de las rutas existentes, para sugerir el siguiente consecutivo. */
  routeNames = $state<string[]>([])

  info = $state<RouteInfo>(emptyInfo())
  stops = $state<RouteStop[]>([])
  advisorId = $state<number | ''>('')

  /** Geometría y tramos calculados por calles. */
  path = $state<LatLng[]>([])
  legs = $state<RouteLeg[]>([])
  routing = $state(false)

  selectedClientId = $state<number | null>(null)
  showErrors = $state(false)
  submitting = $state(false)
  restoredDraft = $state(false)
  /** Id de la última ruta creada, para resaltarla en "Rutas asignadas". */
  lastCreatedId = $state<number | null>(null)
  savedAt = $state<number | null>(null)

  #nameEdited = false
  #routeSeq = 0

  // --- Derivados ---------------------------------------------------------

  clientById = $derived(new Map(this.clients.map((c) => [c.id, c])))
  zone = $derived(catalogs.zones.find((z) => z.id === this.info.zoneId) ?? null)

  schedule = $derived.by<ScheduledStop[]>(() => {
    let t = toMinutes(this.info.horaInicio)
    let previous = this.depot
    const result: ScheduledStop[] = []
    this.stops.forEach((stop, i) => {
      const client = this.clientById.get(stop.clientId)
      if (!client) return
      // Mientras llega la ruta real se usa una estimación.
      const leg = this.legs.length === this.stops.length ? this.legs[i] : estimateLeg(previous, client.coords)
      const llegada = t + leg.duration / 60
      const salida = llegada + stop.duracionVisita
      result.push({ ...stop, client, llegada, salida, leg })
      t = salida
      previous = client.coords
    })
    return result
  })

  totals = $derived.by(() => {
    const start = toMinutes(this.info.horaInicio)
    const end = this.schedule.at(-1)?.salida ?? start
    return {
      paradas: this.schedule.length,
      distancia: this.schedule.reduce((sum, s) => sum + s.leg.distance, 0),
      minutos: end - start,
      fin: end,
      /** Minutos que se pasa de la hora final (0 si cabe). */
      exceso: Math.max(0, end - toMinutes(this.info.horaFin)),
    }
  })

  infoErrors = $derived.by(() => {
    const e: Partial<Record<keyof RouteInfo, string>> = {}
    if (!this.info.nombre.trim()) e.nombre = 'Ingresa un nombre.'
    if (this.info.zoneId === '') e.zoneId = 'Selecciona una zona.'
    if (!this.info.dias.length) e.dias = 'Selecciona al menos un día.'
    if (!this.info.inicio) e.inicio = 'Indica desde cuándo aplica.'
    if (!this.info.horaInicio || !this.info.horaFin) e.horaFin = 'Define el horario.'
    else if (toMinutes(this.info.horaFin) <= toMinutes(this.info.horaInicio))
      e.horaFin = 'Debe ser posterior a la hora inicial.'
    return e
  })

  steps = $derived([
    { title: 'Información de la ruta', subtitle: 'Datos generales', done: Object.keys(this.infoErrors).length === 0 },
    { title: 'Diseño de la ruta', subtitle: 'Ordena las paradas', done: this.stops.length >= MIN_STOPS },
    { title: 'Asignación', subtitle: 'Selecciona un asesor', done: this.advisorId !== '' },
  ])

  /** Primer paso incompleto; 3 cuando todo está listo. */
  currentStep = $derived(this.steps.findIndex((s) => !s.done) === -1 ? 3 : this.steps.findIndex((s) => !s.done))

  advisor = $derived(this.advisors.find((a) => a.id === this.advisorId) ?? null)
  selected = $derived(
    this.schedule.find((s) => s.clientId === this.selectedClientId) ?? this.schedule[0] ?? null,
  )

  // --- Carga --------------------------------------------------------------

  async load() {
    if (this.status === 'loading') return
    this.status = 'loading'
    try {
      // Los tipos de cliente se necesitan para mostrar y filtrar los clientes.
      await catalogs.load()
      const [clients, advisors, routes] = await Promise.all([listClients({ active: true }), listAdvisors(), listRoutes()])
      this.clients = clients.map(toPlanClient).filter((c): c is PlanClient => c !== null)
      this.advisors = advisors.map((a) => ({
        ...a,
        rutasActivas: routes.filter((r) => r.advisorId === a.id && r.status === 'active').length,
      }))
      this.routeNames = routes.map((r) => r.name)

      // Al volver a la pantalla se conserva lo que se estaba armando.
      if (this.restoredDraft || this.stops.length || this.info.nombre) {
        this.status = 'ready'
        return
      }
      const draft = readDraft()
      if (draft) this.#apply(draft)
      this.#nameEdited = !!draft
      this.restoredDraft = !!draft
      this.status = 'ready'
    } catch (error) {
      this.error = error instanceof ApiError ? error.message : 'No pudimos cargar los datos de planeación.'
      this.status = 'error'
    }
  }

  #apply(draft: Draft) {
    this.info = { ...emptyInfo(), ...draft.info }
    this.stops = draft.stops.filter((s) => this.clientById.has(s.clientId))
    this.advisorId = this.advisors.some((a) => a.id === draft.advisorId) ? draft.advisorId : ''
    this.selectedClientId = null
    this.showErrors = false
    void this.#reroute()
  }

  reset() {
    this.#apply({ info: emptyInfo(), stops: [], advisorId: '' })
    this.#nameEdited = false
    this.restoredDraft = false
    this.savedAt = null
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* almacenamiento no disponible */
    }
  }

  // --- Información general -----------------------------------------------

  setZone(zoneId: number | '') {
    this.info.zoneId = zoneId
    const zone = this.zone
    if (!this.#nameEdited && zone) this.info.nombre = suggestRouteName(zoneCode(zone.name), this.routeNames)
  }

  setNombre(nombre: string) {
    this.info.nombre = nombre
    this.#nameEdited = true
  }

  toggleDia(dia: string) {
    this.info.dias = this.info.dias.includes(dia) ? this.info.dias.filter((d) => d !== dia) : [...this.info.dias, dia]
  }

  // --- Paradas -------------------------------------------------------------

  addStop(clientId: number) {
    if (this.stops.some((s) => s.clientId === clientId)) return
    this.stops.push({ clientId, duracionVisita: DEFAULT_VISIT_MINUTES })
    this.selectedClientId = clientId
    void this.#reroute()
  }

  removeStop(clientId: number) {
    this.stops = this.stops.filter((s) => s.clientId !== clientId)
    if (this.selectedClientId === clientId) this.selectedClientId = null
    void this.#reroute()
  }

  moveStop(from: number, to: number) {
    if (to < 0 || to >= this.stops.length || from === to) return
    const [stop] = this.stops.splice(from, 1)
    this.stops.splice(to, 0, stop)
    void this.#reroute()
  }

  updateStop(clientId: number, patch: Partial<Omit<RouteStop, 'clientId'>>) {
    const stop = this.stops.find((s) => s.clientId === clientId)
    if (stop) Object.assign(stop, patch)
  }

  select(clientId: number) {
    this.selectedClientId = clientId
  }

  /** Recalcula el trazado por calles; descarta respuestas viejas si el orden cambió entretanto. */
  async #reroute() {
    const seq = ++this.#routeSeq
    const stopCoords = this.stops
      .map((s) => this.clientById.get(s.clientId)?.coords)
      .filter((c): c is LatLng => !!c)
    const points = [this.depot, ...stopCoords]
    if (points.length < 2) {
      this.path = []
      this.legs = []
      this.routing = false
      return
    }
    this.legs = []
    this.routing = true
    const plan = await getRouteThrough(points)
    if (seq !== this.#routeSeq) return
    this.path = plan.path
    this.legs = plan.legs
    this.routing = false
  }

  // --- Guardar / crear -----------------------------------------------------

  saveDraft() {
    try {
      const draft: Draft = { info: this.info, stops: this.stops, advisorId: this.advisorId }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      this.savedAt = Date.now()
      return true
    } catch {
      return false
    }
  }

  /**
   * Devuelve el índice del primer paso inválido, o crea la ruta y devuelve null.
   * El backend crea la ruta y asocia los clientes en llamadas separadas: se
   * asocian en orden, así cada uno queda con su posición en el recorrido.
   */
  async submit(): Promise<number | null> {
    this.showErrors = true
    if (this.currentStep < 3 || this.info.zoneId === '' || this.advisorId === '') return this.currentStep
    this.submitting = true
    try {
      const route = await createRoute({
        name: this.info.nombre.trim(),
        zoneId: this.info.zoneId,
        executionDays: joinDays(this.info.dias),
        frequency: this.info.frecuencia,
        suggestedStartTime: this.info.horaInicio,
        suggestedEndTime: this.info.horaFin,
        description: this.info.descripcion.trim() || null,
        advisorId: this.advisorId,
        startDate: this.info.inicio,
        endDate: null,
        status: 'active',
      })
      this.lastCreatedId = route.id
      this.routeNames = [...this.routeNames, route.name]
      if (this.advisor) this.advisor.rutasActivas++

      const clientIds = this.stops.map((s) => s.clientId)
      for (const [i, clientId] of clientIds.entries()) {
        try {
          await addRouteClient(route.id, clientId)
        } catch (error) {
          this.reset()
          const reason = error instanceof ApiError ? error.message : 'Error de conexión'
          throw new PartialRouteError(route, clientIds.length - i, reason)
        }
      }
      this.reset()
      return null
    } finally {
      this.submitting = false
    }
  }
}

export const planner = new RoutePlanner()
