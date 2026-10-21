// Tipos de dominio compartidos por vistas, stores y servicios.

export type LatLng = [number, number]

export type Period = 'semana' | 'mes' | 'trimestre'

export interface Stats {
  visitasRealizadas: number
  visitasProgramadas: number
  metaVisitas: number
  valorCotizado: number
  valorCotizadoPrev: number
  pedidosCerrados: number
  pedidosCerradosPrev: number
  facturacion: number
  facturacionPrev: number
}

export type Potencial = 'Alto' | 'Medio' | 'Bajo'

export type VisitStatus = 'pendiente' | 'visitado' | 'reprogramado' | 'sin_visitar'

export type VisitResult = 'Programado' | 'Interesado' | 'Pedido' | 'Sin interés' | 'No visitado'

export type Zona = 'norte' | 'centro' | 'sur' | 'occidente'

export type ClientStatus = 'activo' | 'seguimiento' | 'prospecto' | 'inactivo'

export interface ClientContact {
  nombre: string
  cargo: string
  telefono: string
  email: string
}

export interface Client {
  id: string
  /** Nombre comercial */
  nombre: string
  razonSocial: string
  nit: string
  /** Segmento / tipo de cliente */
  tipo: string
  potencial: Potencial
  estado: ClientStatus
  departamento: string
  municipio: string
  barrio: string
  direccion: string
  telefono: string
  email: string
  coords: LatLng
  zona: Zona
  /** Cada cuántos días se debe visitar. */
  frecuenciaVisita: number
  contacto: ClientContact
  creadoEn: string // ISO
  ultimaVisita: string | null // ISO
}

/** Datos que el usuario diligencia al crear o editar un cliente. */
export type ClientInput = Omit<Client, 'id' | 'coords' | 'zona' | 'departamento' | 'creadoEn' | 'ultimaVisita'>

/** HISTORIAL_CLIENTE */
export interface HistoryEntry {
  id: string
  fecha: string // ISO
  accion: string
  usuario: string
  descripcion: string
}

export interface Asesor {
  id: string
  nombre: string
  zona: Zona
}

/** Asesor con su carga actual (para elegir a quién asignar una ruta). */
export interface AsesorCarga extends Asesor {
  rutasActivas: number
}

// --- Planeación de rutas ------------------------------------------------

export interface RouteInfo {
  nombre: string
  zona: Zona | ''
  dia: string
  frecuencia: string
  horaInicio: string // "HH:MM"
  horaFin: string
  descripcion: string
}

export interface RouteStop {
  clientId: string
  /** Minutos que dura la visita en el cliente. */
  duracionVisita: number
  objetivo?: string
}

export interface RouteLeg {
  distance: number // metros
  duration: number // segundos
}

export interface NewRoute extends RouteInfo {
  stops: RouteStop[]
  asesorId: string
}

export type RouteStatus = 'programada' | 'en_curso' | 'completada'

export interface AssignedRoute extends Omit<NewRoute, 'zona'> {
  id: string
  zona: Zona
  /** Paradas ya visitadas en la ejecución de esta semana. */
  completadas: number
  estado: RouteStatus
}

export interface RoutesSnapshot {
  routes: AssignedRoute[]
  asesores: Asesor[]
  clients: Client[]
}

export interface PlanningData {
  clients: Client[]
  asesores: AsesorCarga[]
  depot: LatLng
  /** Siguiente consecutivo de ruta por zona, para sugerir el nombre. */
  nextSeq: Record<Zona, number>
}

export interface VisitRow {
  id: string
  clientId: string
  fecha: string // ISO
  cliente: string
  municipio: string
  tipo: string
  potencial: Potencial
  estado: VisitStatus
  cotizacion: number | null
  resultado: VisitResult | null
  observacion?: string
}

export type DeliveryStatus = 'en_camino' | 'siguiente' | 'programado'

export interface Delivery {
  id: string
  pedido: string
  cliente: string
  direccion: string
  /** Hora programada de llegada (ISO). */
  programada: string
  from: LatLng
  to: LatLng
  /** Avance del recorrido del tramo, de 0 a 1. */
  progress: number
  /** Duración total estimada del tramo, en segundos. */
  duracion: number
  status: DeliveryStatus
}

export interface DashboardSnapshot {
  stats: Record<Period, Stats>
  visits: VisitRow[]
  deliveries: Delivery[]
  depot: LatLng
  clients: Client[]
}

// --- Cotizaciones y pedidos (COTIZACION, COTIZACION_DETALLE, PEDIDO) -----------

export interface LineItem {
  producto: string
  cantidad: number
  precio: number
}

export type QuoteStatus = 'borrador' | 'enviada' | 'en_revision' | 'aprobada' | 'rechazada'

export interface Quote {
  id: string
  numero: string // COT-1248
  clientId: string
  cliente: string
  asesorId: string
  fecha: string // ISO
  vigenciaDias: number
  valor: number
  estado: QuoteStatus
  items: LineItem[]
  visitId?: string
}

export type OrderStatus = 'confirmado' | 'preparando' | 'en_ruta' | 'entregado' | 'cancelado'

export interface Order {
  id: string
  numero: string // PED-568
  clientId: string
  cliente: string
  quoteId?: string
  fecha: string // ISO, creación
  entrega: string // ISO, fecha estimada de entrega
  valor: number
  estado: OrderStatus
  items: LineItem[]
}

export interface NewQuote {
  clientId: string
  asesorId: string
  vigenciaDias: number
  items: LineItem[]
  estado: 'borrador' | 'enviada'
  visitId?: string
}

export interface NewOrder {
  clientId: string
  entrega: string
  items: LineItem[]
  quoteId?: string
}

/** Registro de una visita realizada (formulario "Registrar visita"). */
export interface VisitReport {
  clientId: string
  asesorId: string
  routeId: string
  fecha: string // ISO con la hora de inicio
  horaFin: string
  canal: string
  objetivo: string
  tipoVisita: string
  potencial: Potencial
  estado: 'visitado' | 'reprogramado' | 'sin_visitar'
  resultado: VisitResult
  observaciones: string
  contacto: ClientContact
  cotizacion: { valor: number } | null
  pedido: { entrega: string } | null
  proximaVisita: string | null // ISO
  adjuntos: string[]
}

export interface VisitReportResult {
  visitId: string
  quote?: Quote
  order?: Order
}

/** Eventos que el servidor envía en tiempo real. */
export type LiveEvent =
  | { type: 'visit.scheduled'; visit: VisitRow }
  | { type: 'visit.completed'; visitId: string; resultado: VisitResult; cotizacion: number | null }
  | { type: 'visit.rescheduled'; visitId: string }
  | { type: 'order.closed'; cliente: string; valor: number }
  | { type: 'delivery.position'; deliveryId: string; progress: number }
  | { type: 'delivery.delivered'; deliveryId: string }
  | { type: 'delivery.created'; delivery: Delivery }
  | { type: 'route.created'; route: AssignedRoute }
  | { type: 'route.progress'; routeId: string; completadas: number }
  | { type: 'client.created'; client: Client; entry: HistoryEntry }
  | { type: 'client.updated'; clientId: string; patch: Partial<Client>; entry?: HistoryEntry }
  | { type: 'visit.registered'; visit: VisitRow }
  | { type: 'quote.created'; quote: Quote }
  | { type: 'quote.updated'; quoteId: string; patch: Partial<Quote> }
  | { type: 'order.created'; order: Order }
  | { type: 'order.updated'; orderId: string; patch: Partial<Order> }
