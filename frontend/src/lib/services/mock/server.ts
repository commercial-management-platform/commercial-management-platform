import { promoteQueue } from '../../domain/deliveries'
import { DIAS, applyProgress, statusForDay, todayIndex } from '../../domain/routes'
import { itemsForValue, nextOrderStatus, total } from '../../domain/commerce'
import { geocode } from '../geocoding'
import type {
  AssignedRoute,
  Client,
  ClientInput,
  ClientStatus,
  HistoryEntry,
  LineItem,
  NewOrder,
  NewQuote,
  Order,
  Quote,
  VisitReport,
  VisitReportResult,
  DashboardSnapshot,
  LiveEvent,
  NewRoute,
  PlanningData,
  RoutesSnapshot,
  VisitResult,
  VisitRow,
} from '../../types'
import {
  ASESORES,
  CLIENTS,
  DELIVERY_POOL,
  MUNICIPIOS,
  ROUTE_SEQ,
  createRoutesSeed,
  createSeed,
  jitter,
  zonaFor,
} from './seed'
import { FIRST_ORDER_NUMBER, FIRST_QUOTE_NUMBER, createOrdersSeed, createQuotesSeed } from './commerceSeed'

// Servidor SIMULADO: guarda su propio estado y emite eventos como lo haría
// un WebSocket / SSE del backend. Las vistas nunca dependen de este archivo
// directamente, solo de `services/api.ts`.

/** Velocidad de la simulación: 1 s real equivale a SPEED s del recorrido. */
const SPEED = 25

type Listener = (event: LiveEvent) => void

const state: DashboardSnapshot = createSeed()
const listeners = new Set<Listener>()
const timers: ReturnType<typeof setTimeout>[] = []
let poolIndex = 0
let visitSeq = 100
let orderSeq = 2060
const routeSeq = { ...ROUTE_SEQ }
const routes: AssignedRoute[] = createRoutesSeed()
const history = new Map<string, HistoryEntry[]>()
let clientSeq = CLIENTS.length + 1
let entrySeq = 1
const quotes: Quote[] = createQuotesSeed()
const orders: Order[] = createOrdersSeed(quotes)
let quoteSeq = FIRST_QUOTE_NUMBER + 1
let orderNumberSeq = FIRST_ORDER_NUMBER + 1

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const random = (min: number, max: number) => min + Math.random() * (max - min)
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]

function emit(event: LiveEvent) {
  applyToServer(event)
  listeners.forEach((listener) => listener(event))
}

/** El servidor también aplica los eventos para mantener su estado coherente. */
function applyToServer(event: LiveEvent) {
  switch (event.type) {
    case 'visit.scheduled':
      state.visits.unshift(event.visit)
      break
    case 'visit.completed': {
      const visit = state.visits.find((v) => v.id === event.visitId)
      if (visit) Object.assign(visit, { estado: 'visitado', resultado: event.resultado, cotizacion: event.cotizacion })
      break
    }
    case 'visit.rescheduled': {
      const visit = state.visits.find((v) => v.id === event.visitId)
      if (visit) Object.assign(visit, { estado: 'reprogramado', resultado: 'No visitado' })
      break
    }
    case 'delivery.position': {
      const delivery = state.deliveries.find((d) => d.id === event.deliveryId)
      if (delivery) delivery.progress = event.progress
      break
    }
    case 'delivery.delivered':
      state.deliveries = state.deliveries.filter((d) => d.id !== event.deliveryId)
      promoteQueue(state.deliveries)
      break
    case 'delivery.created':
      state.deliveries.push(event.delivery)
      promoteQueue(state.deliveries)
      break
    case 'route.created':
      routes.unshift(event.route)
      break
    case 'visit.registered':
      state.visits.unshift(event.visit)
      break
    case 'quote.created':
      quotes.unshift(event.quote)
      break
    case 'quote.updated': {
      const quote = quotes.find((q) => q.id === event.quoteId)
      if (quote) Object.assign(quote, event.patch)
      break
    }
    case 'order.created':
      orders.unshift(event.order)
      break
    case 'order.updated': {
      const order = orders.find((o) => o.id === event.orderId)
      if (order) Object.assign(order, event.patch)
      break
    }
    case 'client.created':
      CLIENTS.push(event.client)
      historyFor(event.client.id).unshift(event.entry)
      break
    case 'client.updated': {
      const client = CLIENTS.find((c) => c.id === event.clientId)
      if (client) Object.assign(client, event.patch)
      if (event.entry) historyFor(event.clientId).unshift(event.entry)
      break
    }
    case 'route.progress': {
      const route = routes.find((r) => r.id === event.routeId)
      if (route) applyProgress(route, event.completadas)
      break
    }
  }
}

// --- Clientes ------------------------------------------------------------

const entry = (accion: string, descripcion: string, usuario: string, fecha = new Date().toISOString()): HistoryEntry => ({
  id: `h${entrySeq++}`,
  fecha,
  accion,
  usuario,
  descripcion,
})

/** Historial del cliente; para los clientes de ejemplo se genera la primera vez que se pide. */
function historyFor(clientId: string): HistoryEntry[] {
  let list = history.get(clientId)
  if (!list) {
    const client = CLIENTS.find((c) => c.id === clientId)
    list = []
    if (client) {
      const asesor = ASESORES[Number(clientId.replace(/\D/g, '')) % ASESORES.length].nombre
      if (client.ultimaVisita) {
        list.push(entry('Visita realizada', `Visita comercial en ${client.barrio}.`, asesor, client.ultimaVisita))
        // La cotización inicial va entre la creación del cliente y su última visita.
        const quotedAt = Math.max(Date.parse(client.creadoEn) + 3_600_000, Date.parse(client.ultimaVisita) - 6 * 86_400_000)
        if (quotedAt < Date.parse(client.ultimaVisita)) {
          list.push(entry('Cotización enviada', 'Cotización inicial del portafolio.', asesor, new Date(quotedAt).toISOString()))
        }
      }
      list.push(entry('Cliente creado', `Registro de ${client.nombre} en la base comercial.`, asesor, client.creadoEn))
    }
    history.set(clientId, list)
  }
  return list
}

/** Estado del cliente después de una visita, según su resultado. */
function statusAfterVisit(current: ClientStatus, resultado: VisitResult): ClientStatus {
  if (resultado === 'Pedido') return 'activo'
  if (resultado === 'Interesado' && current !== 'activo') return 'seguimiento'
  return current
}

async function locate(input: ClientInput): Promise<[number, number]> {
  const found = await geocode(input.direccion, input.municipio, 'Atlántico')
  const centro = MUNICIPIOS.find((m) => m.nombre === input.municipio)?.centro ?? state.depot
  return found ?? jitter(centro, Math.random, 0.01)
}

// --- Cotizaciones y pedidos ------------------------------------------------

function buildQuote(input: NewQuote): Quote {
  const client = CLIENTS.find((c) => c.id === input.clientId) ?? pick(CLIENTS)
  const numero = quoteSeq++
  return {
    id: `q${numero}`,
    numero: `COT-${numero}`,
    clientId: client.id,
    cliente: client.nombre,
    asesorId: input.asesorId,
    fecha: new Date().toISOString(),
    vigenciaDias: input.vigenciaDias,
    valor: total(input.items),
    estado: input.estado,
    items: structuredClone(input.items),
    visitId: input.visitId,
  }
}

function buildOrder(input: NewOrder): Order {
  const client = CLIENTS.find((c) => c.id === input.clientId) ?? pick(CLIENTS)
  const numero = orderNumberSeq++
  return {
    id: `o${numero}`,
    numero: `PED-${numero}`,
    clientId: client.id,
    cliente: client.nombre,
    quoteId: input.quoteId,
    fecha: new Date().toISOString(),
    entrega: input.entrega,
    valor: total(input.items),
    estado: 'confirmado',
    items: structuredClone(input.items),
  }
}

/** Crea un pedido y avisa también al dashboard (KPI de pedidos y facturación). */
function emitOrder(order: Order) {
  emit({ type: 'order.created', order })
  emit({ type: 'order.closed', cliente: order.cliente, valor: order.valor })
}

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

/** Los clientes responden cotizaciones y los pedidos avanzan en bodega. */
function tickCommerce() {
  const roll = Math.random()
  const moving = orders.filter((o) => o.estado === 'confirmado' || o.estado === 'preparando' || o.estado === 'en_ruta')
  if (roll < 0.55 && moving.length) {
    const order = pick(moving)
    const next = nextOrderStatus(order.estado)
    if (next) emit({ type: 'order.updated', orderId: order.id, patch: { estado: next } })
    return
  }
  const pendingQuotes = quotes.filter((q) => q.estado === 'enviada' || q.estado === 'en_revision')
  if (pendingQuotes.length) {
    const quote = pick(pendingQuotes)
    const estado = quote.estado === 'enviada' ? 'en_revision' : Math.random() < 0.7 ? 'aprobada' : 'rechazada'
    emit({ type: 'quote.updated', quoteId: quote.id, patch: { estado } })
  }
}

// --- Generadores de actividad -------------------------------------------

function tickDelivery() {
  const active = state.deliveries.find((d) => d.status === 'en_camino')
  if (!active) return

  const step = SPEED / (active.duracion * 60)
  const progress = Math.min(1, active.progress + step)
  emit({ type: 'delivery.position', deliveryId: active.id, progress })

  if (progress >= 1) {
    emit({ type: 'delivery.delivered', deliveryId: active.id })
    queueNextDelivery()
  }
}

function queueNextDelivery() {
  const last = state.deliveries[state.deliveries.length - 1]
  const next = DELIVERY_POOL[poolIndex++ % DELIVERY_POOL.length]
  const lastEta = last ? new Date(last.programada).getTime() : Date.now()
  emit({
    type: 'delivery.created',
    delivery: {
      id: `d${Date.now()}`,
      pedido: `#PED-${orderSeq++}`,
      cliente: next.cliente,
      direccion: next.direccion,
      programada: new Date(Math.max(lastEta, Date.now()) + (next.duracion + 60) * 60_000).toISOString(),
      from: last ? last.to : state.depot,
      to: next.to,
      progress: 0,
      duracion: next.duracion,
      status: 'programado',
    },
  })
}

function newVisit(clientId: string, fecha: string, observacion?: string): VisitRow {
  const client = CLIENTS.find((c) => c.id === clientId) ?? pick(CLIENTS)
  return {
    id: `v${visitSeq++}`,
    clientId: client.id,
    fecha,
    cliente: client.nombre,
    municipio: client.municipio,
    tipo: client.tipo,
    potencial: client.potencial,
    estado: 'pendiente',
    cotizacion: null,
    resultado: 'Programado',
    observacion,
  }
}

const PROSPECTOS = ['Ferretería La Esquina', 'Panadería San José', 'Logística del Norte', 'Clínica del Mar', 'Muebles Barú', 'Óptica Visión Plus']

function newProspect() {
  const municipio = pick(MUNICIPIOS)
  const coords = jitter(municipio.centro, Math.random)
  const nombre = `${pick(PROSPECTOS)} ${clientSeq}`
  const asesor = pick(ASESORES).nombre
  const client: Client = {
    id: `c${clientSeq++}`,
    nombre,
    razonSocial: `${nombre} S.A.S`,
    nit: `9${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}-${Math.floor(Math.random() * 10)}`,
    tipo: pick(['Retail', 'Servicios', 'Distribuidor']),
    potencial: pick(['Alto', 'Medio', 'Bajo'] as const),
    estado: 'prospecto',
    departamento: 'Atlántico',
    municipio: municipio.nombre,
    barrio: 'Centro',
    direccion: `Calle ${Math.floor(random(10, 99))} #${Math.floor(random(10, 60))}-${Math.floor(random(10, 99))}`,
    telefono: '',
    email: '',
    coords,
    zona: zonaFor(municipio.nombre, coords),
    frecuenciaVisita: 30,
    contacto: { nombre: 'Por definir', cargo: '', telefono: '', email: '' },
    creadoEn: new Date().toISOString(),
    ultimaVisita: null,
  }
  emit({ type: 'client.created', client, entry: entry('Cliente creado', 'Prospecto registrado en campo.', asesor) })
}

function randomBusinessEvent() {
  if (Math.random() < 0.08) {
    newProspect()
    return
  }
  // Solo se pueden "realizar" las visitas pendientes de hoy o anteriores.
  const endOfToday = new Date().setHours(23, 59, 59, 999)
  const pending = state.visits.filter((v) => v.estado === 'pendiente' && new Date(v.fecha).getTime() <= endOfToday)
  const roll = Math.random()

  if (pending.length > 0 && roll < 0.45) {
    const visit = pick(pending)
    const resultado: VisitResult = pick(['Interesado', 'Interesado', 'Pedido', 'Sin interés'])
    const cotizacion = resultado === 'Sin interés' ? null : Math.round(random(6_000, 32_000) / 100) * 100
    emit({ type: 'visit.completed', visitId: visit.id, resultado, cotizacion })
    const client = CLIENTS.find((c) => c.id === visit.clientId)
    if (client) {
      const asesor = pick(ASESORES).nombre
      emit({
        type: 'client.updated',
        clientId: client.id,
        patch: { ultimaVisita: new Date().toISOString(), estado: statusAfterVisit(client.estado, resultado) },
        entry: entry('Visita realizada', `Resultado: ${resultado}${cotizacion ? ` · cotización $${cotizacion.toLocaleString('en-US')}` : ''}.`, asesor),
      })
    }
    if (cotizacion) {
      const items: LineItem[] = itemsForValue(cotizacion)
      const quote = buildQuote({ clientId: visit.clientId, asesorId: pick(ASESORES).id, vigenciaDias: 15, items, estado: 'enviada', visitId: visit.id })
      emit({ type: 'quote.created', quote })
      if (resultado === 'Pedido') {
        timers.push(
          setTimeout(() => {
            emit({ type: 'quote.updated', quoteId: quote.id, patch: { estado: 'aprobada' } })
            emitOrder(buildOrder({ clientId: visit.clientId, entrega: inDays(5), items: quote.items, quoteId: quote.id }))
          }, 1500),
        )
      }
    }
  } else if (roll < 0.75 || pending.length === 0) {
    const fecha = new Date(Date.now() + Math.floor(random(0, 3)) * 86_400_000)
    fecha.setHours(Math.floor(random(8, 17)), 0, 0, 0)
    emit({ type: 'visit.scheduled', visit: newVisit(pick(CLIENTS).id, fecha.toISOString()) })
  } else if (roll < 0.88 && pending.length > 1) {
    emit({ type: 'visit.rescheduled', visitId: pick(pending).id })
  } else {
    emitOrder(buildOrder({ clientId: pick(CLIENTS).id, entrega: inDays(4), items: itemsForValue(random(4_000, 20_000)) }))
  }
}

/** Un asesor completa una parada en alguna de las rutas que se ejecutan hoy. */
function tickRoutes() {
  const today = DIAS[todayIndex()]
  const running = routes.filter((r) => r.dia === today && r.estado !== 'completada')
  if (running.length === 0) return
  const route = pick(running)
  emit({ type: 'route.progress', routeId: route.id, completadas: route.completadas + 1 })
}

function start() {
  const deliveryLoop = setInterval(tickDelivery, 1000)
  timers.push(deliveryLoop)

  const scheduleNext = () => {
    timers.push(
      setTimeout(() => {
        randomBusinessEvent()
        scheduleNext()
      }, random(4_000, 9_000)),
    )
  }
  scheduleNext()

  const scheduleRoute = () => {
    timers.push(
      setTimeout(() => {
        tickRoutes()
        scheduleRoute()
      }, random(5_000, 10_000)),
    )
  }
  scheduleRoute()

  const scheduleCommerce = () => {
    timers.push(
      setTimeout(() => {
        tickCommerce()
        scheduleCommerce()
      }, random(6_000, 12_000)),
    )
  }
  scheduleCommerce()
}

function stop() {
  timers.forEach((t) => clearTimeout(t))
  timers.length = 0
}

// --- API pública del mock ----------------------------------------------

export const mockServer = {
  async fetchDashboard(): Promise<DashboardSnapshot> {
    await wait(500)
    return structuredClone(state)
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    if (listeners.size === 1) start()
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) stop()
    }
  },

  async scheduleVisit(input: { clientId: string; fecha: string; observacion?: string }): Promise<VisitRow> {
    await wait(600)
    const visit = newVisit(input.clientId, input.fecha, input.observacion)
    emit({ type: 'visit.scheduled', visit })
    return visit
  },

  async fetchPlanningData(): Promise<PlanningData> {
    await wait(350)
    const asesores = ASESORES.map((a) => ({
      ...a,
      rutasActivas: routes.filter((r) => r.asesorId === a.id && r.estado !== 'completada').length,
    }))
    return structuredClone({ clients: CLIENTS, asesores, depot: state.depot, nextSeq: routeSeq })
  },

  async fetchClients(): Promise<Client[]> {
    await wait(400)
    return structuredClone(CLIENTS)
  },

  async fetchClientHistory(clientId: string): Promise<HistoryEntry[]> {
    await wait(250)
    return structuredClone(historyFor(clientId))
  },

  async createClient(input: ClientInput, usuario: string): Promise<Client> {
    const coords = await locate(input)
    const client: Client = {
      ...structuredClone(input),
      id: `c${clientSeq++}`,
      departamento: 'Atlántico',
      coords,
      zona: zonaFor(input.municipio, coords),
      creadoEn: new Date().toISOString(),
      ultimaVisita: null,
    }
    emit({ type: 'client.created', client, entry: entry('Cliente creado', 'Registro en la base comercial.', usuario) })
    return structuredClone(client)
  },

  async updateClient(clientId: string, input: ClientInput, usuario: string): Promise<Client> {
    const current = CLIENTS.find((c) => c.id === clientId)
    if (!current) throw new Error('Cliente no encontrado')
    const moved = current.direccion !== input.direccion || current.municipio !== input.municipio
    const coords = moved ? await locate(input) : current.coords
    const patch: Partial<Client> = { ...structuredClone(input), coords, zona: zonaFor(input.municipio, coords) }
    const changes = (Object.keys(input) as (keyof ClientInput)[]).filter(
      (k) => JSON.stringify(current[k]) !== JSON.stringify(input[k]),
    )
    const descripcion = changes.includes('estado')
      ? `Estado cambiado a "${input.estado}".`
      : `Datos actualizados (${changes.length} ${changes.length === 1 ? 'campo' : 'campos'}).`
    emit({ type: 'client.updated', clientId, patch, entry: entry('Cliente actualizado', descripcion, usuario) })
    return structuredClone({ ...current })
  },

  async fetchQuotes(): Promise<Quote[]> {
    await wait(350)
    return structuredClone(quotes)
  },

  async fetchOrders(): Promise<Order[]> {
    await wait(350)
    return structuredClone(orders)
  },

  async createQuote(input: NewQuote): Promise<Quote> {
    await wait(500)
    const quote = buildQuote(input)
    emit({ type: 'quote.created', quote })
    return structuredClone(quote)
  },

  async updateQuoteStatus(quoteId: string, estado: Quote['estado']): Promise<void> {
    await wait(300)
    emit({ type: 'quote.updated', quoteId, patch: { estado } })
  },

  async createOrder(input: NewOrder): Promise<Order> {
    await wait(500)
    const order = buildOrder(input)
    emitOrder(order)
    return structuredClone(order)
  },

  async updateOrderStatus(orderId: string, estado: Order['estado']): Promise<void> {
    await wait(300)
    emit({ type: 'order.updated', orderId, patch: { estado } })
  },

  /**
   * Registra una visita realizada. Si el cliente tenía una visita pendiente para hoy,
   * se completa esa; si no, se crea una nueva. Además actualiza el cliente, la ruta,
   * y genera la cotización / pedido / próxima visita que correspondan.
   */
  async registerVisit(report: VisitReport, usuario: string): Promise<VisitReportResult> {
    await wait(700)
    const client = CLIENTS.find((c) => c.id === report.clientId)
    if (!client) throw new Error('Cliente no encontrado')

    const endOfToday = new Date().setHours(23, 59, 59, 999)
    const pending = state.visits.find(
      (v) => v.clientId === client.id && v.estado === 'pendiente' && Date.parse(v.fecha) <= endOfToday,
    )
    const visited = report.estado === 'visitado'
    const cotizacion = visited && report.cotizacion ? report.cotizacion.valor : null
    let visitId: string

    if (pending && visited) {
      visitId = pending.id
      emit({ type: 'visit.completed', visitId, resultado: report.resultado, cotizacion })
    } else if (pending && report.estado === 'reprogramado') {
      visitId = pending.id
      emit({ type: 'visit.rescheduled', visitId })
    } else {
      const visit = newVisit(client.id, report.fecha, report.observaciones || undefined)
      Object.assign(visit, {
        estado: report.estado,
        resultado: visited ? report.resultado : 'No visitado',
        cotizacion,
      })
      visitId = visit.id
      emit({ type: 'visit.registered', visit })
    }

    emit({
      type: 'client.updated',
      clientId: client.id,
      patch: {
        potencial: report.potencial,
        contacto: structuredClone(report.contacto),
        ...(visited ? { ultimaVisita: report.fecha, estado: statusAfterVisit(client.estado, report.resultado) } : {}),
      },
      entry: entry(
        visited ? 'Visita realizada' : 'Visita no realizada',
        report.observaciones || `${report.objetivo} · ${report.resultado}.`,
        usuario,
      ),
    })

    // La parada del cliente cuenta como completada en su ruta de hoy.
    const route = routes.find((r) => r.id === report.routeId)
    if (visited && route && route.estado !== 'completada' && route.stops.some((s) => s.clientId === client.id)) {
      emit({ type: 'route.progress', routeId: route.id, completadas: route.completadas + 1 })
    }

    const result: VisitReportResult = { visitId }
    if (cotizacion) {
      const items: LineItem[] = [{ producto: `Propuesta comercial · ${report.objetivo}`, cantidad: 1, precio: cotizacion }]
      result.quote = buildQuote({ clientId: client.id, asesorId: report.asesorId, vigenciaDias: 15, items, estado: 'enviada', visitId })
      emit({ type: 'quote.created', quote: result.quote })
    }
    if (visited && report.pedido) {
      const items = result.quote?.items ?? [{ producto: 'Pedido de visita', cantidad: 1, precio: cotizacion ?? 0 }]
      if (result.quote) emit({ type: 'quote.updated', quoteId: result.quote.id, patch: { estado: 'aprobada' } })
      result.order = buildOrder({ clientId: client.id, entrega: report.pedido.entrega, items, quoteId: result.quote?.id })
      emitOrder(result.order)
    }
    if (report.proximaVisita) {
      emit({ type: 'visit.scheduled', visit: newVisit(client.id, report.proximaVisita) })
    }
    return structuredClone(result)
  },

  async fetchRoutes(): Promise<RoutesSnapshot> {
    await wait(400)
    return structuredClone({ routes, asesores: ASESORES, clients: CLIENTS })
  },

  async createRoute(input: NewRoute): Promise<AssignedRoute> {
    await wait(800)
    if (!input.zona) throw new Error('La ruta necesita una zona')
    const route: AssignedRoute = {
      ...structuredClone(input),
      zona: input.zona,
      id: `r${Date.now()}`,
      completadas: 0,
      // Si su día es hoy queda en curso; si ya pasó, arranca en la próxima ejecución.
      estado: statusForDay(input.dia) === 'en_curso' ? 'en_curso' : 'programada',
    }
    routeSeq[input.zona]++
    emit({ type: 'route.created', route })
    return route
  },
}

// En desarrollo, si este módulo se recarga en caliente (HMR) quedarían dos servidores
// simulados emitiendo eventos sobre los mismos datos. Se fuerza una recarga completa.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stop()
    listeners.clear()
    location.reload()
  })
}
