import { api } from '../services/api'
import { estimateLeg, getRouteThrough } from '../services/routing'
import { ZONAS } from '../domain/routes'
import type { AsesorCarga, Client, LatLng, RouteInfo, RouteLeg, RouteStop, Zona } from '../types'
import { toMinutes } from '../utils/format'

const DRAFT_KEY = 'kestrel.route-draft'
const DEFAULT_VISIT_MINUTES = 30
export const MIN_STOPS = 2

export { DIAS, FRECUENCIAS, ZONAS } from '../domain/routes'

const emptyInfo = (): RouteInfo => ({
  nombre: '',
  zona: '',
  dia: '',
  frecuencia: 'Semanal',
  horaInicio: '08:00',
  horaFin: '12:00',
  descripcion: '',
})

// Ruta de ejemplo con la que abre la vista (igual al diseño).
const EXAMPLE = {
  info: {
    nombre: 'RUT-NORTE-001',
    zona: 'norte',
    dia: 'Martes',
    frecuencia: 'Semanal',
    horaInicio: '08:00',
    horaFin: '12:00',
    descripcion: 'Ruta para clientes prioritarios de la zona norte.',
  } satisfies RouteInfo,
  stops: ['c1', 'c2', 'c3'].map((clientId) => ({ clientId, duracionVisita: 45 })),
  asesorId: 'a1',
}

interface Draft {
  info: RouteInfo
  stops: RouteStop[]
  asesorId: string
}

export interface ScheduledStop extends RouteStop {
  client: Client
  /** Minutos desde la medianoche. */
  llegada: number
  salida: number
  /** Tramo desde la parada anterior (o la bodega). */
  leg: RouteLeg
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

class RoutePlanner {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  clients = $state<Client[]>([])
  asesores = $state<AsesorCarga[]>([])
  depot = $state<LatLng>([0, 0])
  nextSeq = $state<Record<Zona, number>>({ norte: 1, centro: 1, sur: 1, occidente: 1 })

  info = $state<RouteInfo>(emptyInfo())
  stops = $state<RouteStop[]>([])
  asesorId = $state('')

  /** Geometría y tramos calculados por calles. */
  path = $state<LatLng[]>([])
  legs = $state<RouteLeg[]>([])
  routing = $state(false)

  selectedClientId = $state<string | null>(null)
  showErrors = $state(false)
  submitting = $state(false)
  restoredDraft = $state(false)
  /** Id de la última ruta creada, para resaltarla en "Rutas asignadas". */
  lastCreatedId = $state<string | null>(null)
  savedAt = $state<number | null>(null)

  #nameEdited = false
  #routeSeq = 0

  // --- Derivados ---------------------------------------------------------

  clientById = $derived(new Map(this.clients.map((c) => [c.id, c])))

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
    if (!this.info.zona) e.zona = 'Selecciona una zona.'
    if (!this.info.dia) e.dia = 'Selecciona un día.'
    if (!this.info.horaInicio || !this.info.horaFin) e.horaFin = 'Define el horario.'
    else if (toMinutes(this.info.horaFin) <= toMinutes(this.info.horaInicio))
      e.horaFin = 'Debe ser posterior a la hora inicial.'
    return e
  })

  steps = $derived([
    { title: 'Información de la ruta', subtitle: 'Datos generales', done: Object.keys(this.infoErrors).length === 0 },
    { title: 'Diseño de la ruta', subtitle: 'Ordena las paradas', done: this.stops.length >= MIN_STOPS },
    { title: 'Asignación', subtitle: 'Selecciona un asesor', done: !!this.asesorId },
  ])

  /** Primer paso incompleto; 3 cuando todo está listo. */
  currentStep = $derived(this.steps.findIndex((s) => !s.done) === -1 ? 3 : this.steps.findIndex((s) => !s.done))

  asesor = $derived(this.asesores.find((a) => a.id === this.asesorId) ?? null)
  selected = $derived(
    this.schedule.find((s) => s.clientId === this.selectedClientId) ?? this.schedule[0] ?? null,
  )

  // --- Carga --------------------------------------------------------------

  async load() {
    if (this.status === 'ready' || this.status === 'loading') return
    this.status = 'loading'
    try {
      const data = await api.fetchPlanningData()
      this.clients = data.clients
      this.asesores = data.asesores
      this.depot = data.depot
      this.nextSeq = data.nextSeq

      const draft = readDraft()
      this.#apply(draft ?? EXAMPLE)
      this.#nameEdited = !!draft
      // El ejemplo toma el siguiente consecutivo libre de su zona.
      if (!draft) this.setZona('norte')
      this.restoredDraft = !!draft
      this.status = 'ready'
    } catch {
      this.status = 'error'
    }
  }

  #apply(draft: Draft) {
    this.info = { ...emptyInfo(), ...draft.info }
    this.stops = draft.stops.filter((s) => this.clientById.has(s.clientId))
    this.asesorId = draft.asesorId
    this.selectedClientId = null
    this.showErrors = false
    this.#reroute()
  }

  reset() {
    this.#apply({ info: emptyInfo(), stops: [], asesorId: '' })
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

  setZona(zona: Zona | '') {
    this.info.zona = zona
    if (!this.#nameEdited && zona) {
      const code = ZONAS.find((z) => z.value === zona)?.code
      this.info.nombre = `RUT-${code}-${String(this.nextSeq[zona]).padStart(3, '0')}`
    }
  }

  setNombre(nombre: string) {
    this.info.nombre = nombre
    this.#nameEdited = true
  }

  // --- Paradas -------------------------------------------------------------

  addStop(clientId: string) {
    if (this.stops.some((s) => s.clientId === clientId)) return
    this.stops.push({ clientId, duracionVisita: DEFAULT_VISIT_MINUTES })
    this.selectedClientId = clientId
    this.#reroute()
  }

  removeStop(clientId: string) {
    this.stops = this.stops.filter((s) => s.clientId !== clientId)
    if (this.selectedClientId === clientId) this.selectedClientId = null
    this.#reroute()
  }

  moveStop(from: number, to: number) {
    if (to < 0 || to >= this.stops.length || from === to) return
    const [stop] = this.stops.splice(from, 1)
    this.stops.splice(to, 0, stop)
    this.#reroute()
  }

  updateStop(clientId: string, patch: Partial<Omit<RouteStop, 'clientId'>>) {
    const stop = this.stops.find((s) => s.clientId === clientId)
    if (stop) Object.assign(stop, patch)
  }

  select(clientId: string) {
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
      const draft: Draft = { info: this.info, stops: this.stops, asesorId: this.asesorId }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      this.savedAt = Date.now()
      return true
    } catch {
      return false
    }
  }

  /** Devuelve el índice del primer paso inválido, o crea la ruta y devuelve null. */
  async submit(): Promise<number | null> {
    this.showErrors = true
    if (this.currentStep < 3) return this.currentStep
    this.submitting = true
    try {
      // Se envía una copia plana: los proxies de $state no se pueden serializar/clonar.
      const route = await api.createRoute(
        $state.snapshot({ ...this.info, stops: this.stops, asesorId: this.asesorId }),
      )
      this.lastCreatedId = route.id
      const asesor = this.asesor
      if (asesor) asesor.rutasActivas++
      if (this.info.zona) this.nextSeq[this.info.zona]++
      this.reset()
      return null
    } finally {
      this.submitting = false
    }
  }
}

export const planner = new RoutePlanner()
