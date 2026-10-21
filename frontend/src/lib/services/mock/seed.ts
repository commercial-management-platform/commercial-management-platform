import { SEGMENTOS } from '../../domain/clients'
import { DIAS, statusForDay, todayIndex } from '../../domain/routes'
import type {
  Asesor,
  AssignedRoute,
  Client,
  ClientStatus,
  DashboardSnapshot,
  Delivery,
  LatLng,
  Potencial,
  VisitRow,
  Zona,
} from '../../types'

// Datos de ejemplo del área metropolitana de Barranquilla.

export const DEPOT: LatLng = [10.9633, -74.7905]

type BaseClient = Pick<Client, 'id' | 'nombre' | 'municipio' | 'tipo' | 'potencial' | 'direccion' | 'coords' | 'zona'>

const BASE_CLIENTS: BaseClient[] = [
  { id: 'c1', nombre: 'Grupo Horizonte', municipio: 'Barranquilla', tipo: 'Industrial', potencial: 'Alto', direccion: 'Cra. 54 #68-196, El Prado', coords: [10.9925, -74.8031], zona: 'norte' },
  { id: 'c2', nombre: 'Nova Tech', municipio: 'Barranquilla', tipo: 'Tecnología', potencial: 'Alto', direccion: 'Calle 84 #51B-15, Alto Prado', coords: [11.0038, -74.8113], zona: 'norte' },
  { id: 'c3', nombre: 'Comercial Rivera', municipio: 'Soledad', tipo: 'Distribuidor', potencial: 'Medio', direccion: 'Cra. 30 #18-45, Soledad', coords: [10.9182, -74.7712], zona: 'sur' },
  { id: 'c4', nombre: 'Acero Central', municipio: 'Malambo', tipo: 'Distribuidor', potencial: 'Medio', direccion: 'Calle 12 #20-11, Malambo', coords: [10.8595, -74.7738], zona: 'sur' },
  { id: 'c5', nombre: 'Distribuidora Costa', municipio: 'Soledad', tipo: 'Retail', potencial: 'Bajo', direccion: 'Cra. 21 #55-30, Soledad', coords: [10.9053, -74.7895], zona: 'sur' },
  { id: 'c6', nombre: 'Lácteos del Caribe', municipio: 'Barranquilla', tipo: 'Industrial', potencial: 'Alto', direccion: 'Calle 30 #1-25, Barranquillita', coords: [10.9586, -74.7768], zona: 'centro' },
  { id: 'c7', nombre: 'Supermercado La 72', municipio: 'Barranquilla', tipo: 'Retail', potencial: 'Medio', direccion: 'Calle 72 #46-30, El Prado', coords: [10.9986, -74.8001], zona: 'norte' },
  { id: 'c8', nombre: 'Ferretería El Puerto', municipio: 'Puerto Colombia', tipo: 'Retail', potencial: 'Medio', direccion: 'Cra. 5 #3-40, Puerto Colombia', coords: [10.9878, -74.9545], zona: 'occidente' },
  { id: 'c9', nombre: 'Textiles Atlántico', municipio: 'Galapa', tipo: 'Industrial', potencial: 'Medio', direccion: 'Calle 9 #14-22, Galapa', coords: [10.8983, -74.8836], zona: 'occidente' },
  { id: 'c10', nombre: 'Clínica Bellavista', municipio: 'Barranquilla', tipo: 'Servicios', potencial: 'Alto', direccion: 'Cra. 51B #79-150, Alto Prado', coords: [10.9968, -74.8082], zona: 'norte' },
  { id: 'c11', nombre: 'Agroinsumos del Norte', municipio: 'Sabanalarga', tipo: 'Distribuidor', potencial: 'Bajo', direccion: 'Calle 20 #18-30, Sabanalarga', coords: [10.6319, -74.922], zona: 'sur' },
  { id: 'c12', nombre: 'Constructora Mar Azul', municipio: 'Puerto Colombia', tipo: 'Industrial', potencial: 'Alto', direccion: 'Km 2 Vía al Mar, Pradomar', coords: [11.0096, -74.9105], zona: 'occidente' },
  { id: 'c13', nombre: 'Induacero S.A.S', municipio: 'Barranquilla', tipo: 'Industrial', potencial: 'Alto', direccion: 'Vía 40 #77-200, Zona Industrial', coords: [10.9998, -74.786], zona: 'norte' },
  { id: 'c14', nombre: 'Ferretería Central', municipio: 'Barranquilla', tipo: 'Distribuidor', potencial: 'Medio', direccion: 'Calle 45 #41-12, Centro', coords: [10.98, -74.784], zona: 'centro' },
  { id: 'c15', nombre: 'Prodeco Ltda.', municipio: 'Soledad', tipo: 'Industrial', potencial: 'Medio', direccion: 'Cra. 14 #30-55, Soledad', coords: [10.912, -74.781], zona: 'sur' },
  { id: 'c16', nombre: 'Suministros del Caribe', municipio: 'Malambo', tipo: 'Distribuidor', potencial: 'Bajo', direccion: 'Calle 8 #12-40, Malambo', coords: [10.862, -74.779], zona: 'sur' },
  { id: 'c17', nombre: 'Hotel Prado Mar', municipio: 'Barranquilla', tipo: 'Servicios', potencial: 'Medio', direccion: 'Cra. 54 #70-10, El Prado', coords: [10.9952, -74.8019], zona: 'norte' },
  { id: 'c18', nombre: 'Droguería Riomar', municipio: 'Barranquilla', tipo: 'Retail', potencial: 'Medio', direccion: 'Calle 98 #52-115, Riomar', coords: [11.0125, -74.8205], zona: 'norte' },
]

// --- Datos complementarios (generados de forma determinística) ---------------

/** Generador pseudoaleatorio con semilla, para que los datos no cambien entre recargas. */
function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return x / 2147483648
  }
}

const CONTACTOS = ['Carlos Mendoza', 'Paola Herrera', 'Diego Lara', 'Marta Silva', 'Andrés Pacheco', 'Juliana Ortiz', 'Fernando Rojas', 'Camila Vargas', 'Ricardo Gómez', 'Natalia Pérez', 'Sergio Castro', 'Valentina Ríos']
const CARGOS = ['Gerente de compras', 'Jefe de compras', 'Administradora', 'Director comercial', 'Coordinador de abastecimiento']
const ESTADOS: ClientStatus[] = ['activo', 'activo', 'activo', 'seguimiento', 'activo', 'prospecto', 'seguimiento', 'activo', 'inactivo']
/** Estados del diseño para clientes puntuales. */
const ESTADO_FIJO: Record<string, ClientStatus> = { c1: 'activo', c2: 'activo', c3: 'seguimiento', c4: 'activo' }

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

function daysAgo(days: number, hour = 10): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function enrich(base: BaseClient, i: number): Client {
  const rand = seeded(i + 7)
  const contacto = CONTACTOS[i % CONTACTOS.length]
  const estado = ESTADO_FIJO[base.id] ?? ESTADOS[i % ESTADOS.length]
  const company = slug(base.nombre)
  const lastVisitDaysAgo = i < 4 ? i * 2 : Math.floor(rand() * 40) + 2
  // ~1 de cada 5 clientes se creó este mes (siempre antes de su primera actividad); el resto, meses atrás.
  const createdDaysAgo = i % 5 === 0 ? Math.min(new Date().getDate() - 1, 14) : 40 + Math.floor(rand() * 500)
  return {
    ...base,
    razonSocial: /S\.A\.S|Ltda/.test(base.nombre) ? base.nombre : `${base.nombre} S.A.S`,
    nit: `9${String(Math.floor(rand() * 1e8)).padStart(8, '0')}-${i % 10}`,
    departamento: 'Atlántico',
    barrio: base.direccion.split(',')[1]?.trim() ?? 'Centro',
    telefono: `605 3${String(Math.floor(rand() * 1e6)).padStart(6, '0')}`,
    email: `contacto@${company}.com`,
    estado,
    frecuenciaVisita: [7, 15, 30][i % 3],
    contacto: {
      nombre: contacto,
      cargo: CARGOS[i % CARGOS.length],
      telefono: `30${Math.floor(rand() * 10)} ${String(Math.floor(rand() * 1e7)).padStart(7, '0')}`,
      email: `${slug(contacto.split(' ')[0])}.${slug(contacto.split(' ')[1])}@${company}.com`,
    },
    creadoEn: daysAgo(createdDaysAgo),
    ultimaVisita: estado === 'prospecto' || lastVisitDaysAgo >= createdDaysAgo ? null : daysAgo(lastVisitDaysAgo, 9 + (i % 8)),
  }
}

/** Centros aproximados por municipio, para ubicar clientes sin coordenadas exactas. */
export const MUNICIPIOS: { nombre: string; centro: LatLng; zona: Zona }[] = [
  { nombre: 'Barranquilla', centro: [10.985, -74.802], zona: 'norte' },
  { nombre: 'Soledad', centro: [10.912, -74.782], zona: 'sur' },
  { nombre: 'Malambo', centro: [10.86, -74.776], zona: 'sur' },
  { nombre: 'Puerto Colombia', centro: [10.99, -74.952], zona: 'occidente' },
  { nombre: 'Galapa', centro: [10.897, -74.886], zona: 'occidente' },
]


/** Barranquilla se divide en norte / centro según la latitud. */
export function zonaFor(municipio: string, coords: LatLng): Zona {
  if (municipio === 'Barranquilla') return coords[0] > 10.975 ? 'norte' : 'centro'
  return MUNICIPIOS.find((m) => m.nombre === municipio)?.zona ?? 'centro'
}

export function jitter([lat, lng]: LatLng, rand: () => number, spread = 0.018): LatLng {
  return [lat + (rand() - 0.5) * spread, lng + (rand() - 0.5) * spread]
}

const PREFIJOS = ['Inversiones', 'Comercializadora', 'Distribuciones', 'Industrias', 'Almacenes', 'Soluciones', 'Servicios', 'Suministros']
const SUFIJOS = ['del Litoral', 'Andina', 'Costa Azul', 'Caribe Express', 'Los Robles', 'El Bosque', 'Prado Norte', 'Puerto Sol', 'La Ribera', 'Bahía']
const CALLES = ['Calle 76 #54-21', 'Cra. 43 #84-160', 'Calle 30 #22-15', 'Cra. 8 #12-40', 'Calle 17 #9-33', 'Cra. 50 #64-12']

function synthetic(count: number): BaseClient[] {
  const rand = seeded(42)
  const potenciales: Potencial[] = ['Alto', 'Medio', 'Medio', 'Bajo']
  return Array.from({ length: count }, (_, i) => {
    const municipio = MUNICIPIOS[Math.floor(rand() * MUNICIPIOS.length)]
    const coords = jitter(municipio.centro, rand)
    return {
      id: `c${19 + i}`,
      nombre: `${PREFIJOS[i % PREFIJOS.length]} ${SUFIJOS[(i * 3) % SUFIJOS.length]}`,
      municipio: municipio.nombre,
      tipo: SEGMENTOS[Math.floor(rand() * SEGMENTOS.length)],
      potencial: potenciales[Math.floor(rand() * potenciales.length)],
      direccion: `${CALLES[i % CALLES.length]}, ${municipio.nombre === 'Barranquilla' ? 'El Recreo' : 'Centro'}`,
      coords,
      zona: zonaFor(municipio.nombre, coords),
    }
  })
}

export const CLIENTS: Client[] = [...BASE_CLIENTS, ...synthetic(30)].map(enrich)

export const ASESORES: Asesor[] = [
  { id: 'a1', nombre: 'Andrea Méndez', zona: 'norte' },
  { id: 'a2', nombre: 'Carlos Núñez', zona: 'centro' },
  { id: 'a3', nombre: 'Laura Ruiz', zona: 'sur' },
  { id: 'a4', nombre: 'Miguel Torres', zona: 'norte' },
]

/** Rutas de la semana: [nombre, zona, asesor, día, paradas, hora inicio]. */
const ROUTE_PLAN: [string, Zona, string, string, number, string][] = [
  ['RUT-NORTE-001', 'norte', 'a1', 'Martes', 7, '08:00'],
  ['RUT-NORTE-002', 'norte', 'a1', 'Lunes', 6, '08:00'],
  ['RUT-NORTE-004', 'norte', 'a1', 'Jueves', 5, '13:00'],
  ['RUT-CENTRO-004', 'centro', 'a2', 'Miércoles', 6, '08:00'],
  ['RUT-CENTRO-002', 'centro', 'a2', 'Lunes', 5, '09:00'],
  ['RUT-CENTRO-003', 'centro', 'a2', 'Martes', 6, '13:00'],
  ['RUT-SUR-002', 'sur', 'a3', 'Jueves', 8, '07:30'],
  ['RUT-SUR-001', 'sur', 'a3', 'Martes', 6, '08:00'],
  ['RUT-OCC-001', 'occidente', 'a3', 'Viernes', 5, '08:00'],
  ['RUT-NORTE-006', 'norte', 'a4', 'Viernes', 5, '08:00'],
  ['RUT-NORTE-005', 'norte', 'a4', 'Martes', 6, '08:00'],
  ['RUT-NORTE-003', 'norte', 'a4', 'Lunes', 7, '08:30'],
  ['RUT-SUR-004', 'sur', 'a3', 'Sábado', 4, '09:00'],
  ['RUT-CENTRO-001', 'centro', 'a2', 'Viernes', 5, '08:00'],
]

/** Consecutivo siguiente por zona, coherente con ROUTE_PLAN. */
export const ROUTE_SEQ: Record<Zona, number> = { norte: 7, centro: 5, sur: 5, occidente: 2 }

/** Clientes de la zona primero y luego del resto, para completar las paradas. */
function clientsFor(zona: Zona, count: number, offset: number): string[] {
  const own = CLIENTS.filter((c) => c.zona === zona)
  const others = CLIENTS.filter((c) => c.zona !== zona)
  const shift = offset % own.length
  return [...own.slice(shift), ...own.slice(0, shift), ...others].slice(0, count).map((c) => c.id)
}

export function createRoutesSeed(): AssignedRoute[] {
  const today = todayIndex()
  return ROUTE_PLAN.map(([nombre, zona, asesorId, dia, paradas, horaInicio], i) => {
    const estado = statusForDay(dia)
    // Las rutas de hoy arrancan con avance parcial; las de días pasados, completas.
    const completadas = estado === 'completada' ? paradas : estado === 'en_curso' ? Math.floor(paradas * 0.45) : 0
    const [h, m] = horaInicio.split(':').map(Number)
    return {
      id: `r${i + 1}`,
      nombre,
      zona,
      asesorId,
      dia,
      frecuencia: 'Semanal',
      horaInicio,
      horaFin: `${String(h + Math.ceil(paradas * 0.75)).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      descripcion: DIAS.indexOf(dia) === today ? 'Ruta en ejecución hoy.' : '',
      stops: clientsFor(zona, paradas, i).map((clientId) => ({ clientId, duracionVisita: 40 })),
      completadas,
      estado: estado === 'en_curso' && completadas === 0 ? 'programada' : estado,
    }
  })
}

/** Destinos que se van sumando a la cola de entregas mientras corre la simulación. */
export const DELIVERY_POOL: { cliente: string; direccion: string; to: LatLng; duracion: number }[] = [
  { cliente: 'Clínica Bellavista', direccion: 'Cra. 51B #79-150, Alto Prado', to: [10.9968, -74.8082], duracion: 25 },
  { cliente: 'Distribuidora Costa', direccion: 'Cra. 21 #55-30, Soledad', to: [10.9053, -74.7895], duracion: 40 },
  { cliente: 'Supermercado La 72', direccion: 'Calle 72 #46-30, El Prado', to: [10.9986, -74.8001], duracion: 30 },
  { cliente: 'Acero Central', direccion: 'Calle 12 #20-11, Malambo', to: [10.8595, -74.7738], duracion: 45 },
  { cliente: 'Lácteos del Caribe', direccion: 'Calle 30 #1-25, Barranquillita', to: [10.9586, -74.7768], duracion: 35 },
]

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000).toISOString()

function row(id: string, clientId: string, fecha: string, rest: Partial<VisitRow>): VisitRow {
  const c = CLIENTS.find((x) => x.id === clientId)!
  return {
    id,
    clientId,
    fecha,
    cliente: c.nombre,
    municipio: c.municipio,
    tipo: c.tipo,
    potencial: c.potencial,
    estado: 'pendiente',
    cotizacion: null,
    resultado: 'Programado',
    ...rest,
  }
}

export function createSeed(): DashboardSnapshot {
  const deliveries: Delivery[] = [
    {
      id: 'd1',
      pedido: '#PED-2048',
      cliente: 'Grupo Horizonte',
      direccion: 'Cra. 54 #68-196, El Prado',
      programada: minutesFromNow(25),
      from: DEPOT,
      to: [10.9925, -74.8031],
      progress: 0.38,
      duracion: 35,
      status: 'en_camino',
    },
    {
      id: 'd2',
      pedido: '#PED-2051',
      cliente: 'Nova Tech',
      direccion: 'Calle 84 #51B-15, Alto Prado',
      programada: minutesFromNow(95),
      from: [10.9925, -74.8031],
      to: [11.0038, -74.8113],
      progress: 0,
      duracion: 20,
      status: 'siguiente',
    },
    {
      id: 'd3',
      pedido: '#PED-2056',
      cliente: 'Comercial Rivera',
      direccion: 'Cra. 30 #18-45, Soledad',
      programada: minutesFromNow(220),
      from: [11.0038, -74.8113],
      to: [10.9182, -74.7712],
      progress: 0,
      duracion: 45,
      status: 'programado',
    },
  ]

  return {
    depot: DEPOT,
    clients: CLIENTS,
    deliveries,
    stats: {
      semana: {
        visitasRealizadas: 19,
        visitasProgramadas: 25,
        metaVisitas: 24,
        valorCotizado: 215_000,
        valorCotizadoPrev: 192_000,
        pedidosCerrados: 8,
        pedidosCerradosPrev: 6,
        facturacion: 128_000,
        facturacionPrev: 118_500,
      },
      mes: {
        visitasRealizadas: 74,
        visitasProgramadas: 96,
        metaVisitas: 100,
        valorCotizado: 812_000,
        valorCotizadoPrev: 760_000,
        pedidosCerrados: 31,
        pedidosCerradosPrev: 27,
        facturacion: 498_000,
        facturacionPrev: 455_000,
      },
      trimestre: {
        visitasRealizadas: 221,
        visitasProgramadas: 280,
        metaVisitas: 300,
        valorCotizado: 2_310_000,
        valorCotizadoPrev: 2_120_000,
        pedidosCerrados: 88,
        pedidosCerradosPrev: 80,
        facturacion: 1_420_000,
        facturacionPrev: 1_310_000,
      },
    },
    visits: [
      row('v8', 'c1', daysAgo(0, 15), {}),
      row('v7', 'c6', daysAgo(0, 11), {}),
      row('v6', 'c5', daysAgo(1, 16), { estado: 'sin_visitar', resultado: null }),
      row('v5', 'c4', daysAgo(1, 10), { estado: 'reprogramado', resultado: 'No visitado' }),
      row('v4', 'c3', daysAgo(2, 15), { estado: 'visitado', cotizacion: 12_600, resultado: 'Pedido' }),
      row('v3', 'c2', daysAgo(2, 9), { estado: 'visitado', cotizacion: 18_500, resultado: 'Interesado' }),
      row('v2', 'c10', daysAgo(3, 14), { estado: 'visitado', cotizacion: 24_800, resultado: 'Interesado' }),
      row('v1', 'c7', daysAgo(5, 10), { estado: 'visitado', cotizacion: null, resultado: 'Sin interés' }),
      row('v0', 'c9', daysAgo(12, 9), { estado: 'visitado', cotizacion: 9_400, resultado: 'Pedido' }),
    ],
  }
}
