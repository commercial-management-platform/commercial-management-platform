import type { AssignedRoute, LatLng, RouteStatus } from '../types'

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const FRECUENCIAS = ['Semanal', 'Quincenal', 'Mensual']

/** Bodega desde la que sale cada recorrido. El backend no la guarda: solo sirve para trazar el mapa. */
export const DEPOT: LatLng = [10.9633, -74.7905]

// --- Planeación con datos del backend (HU-07) ----------------------------

/** Cliente con coordenadas, listo para el mapa de planeación. */
export interface PlanClient {
  id: number
  nombre: string
  direccion: string
  municipio: string
  /** Nombre del tipo de cliente (catálogo). */
  tipo: string
  zoneId: number | null
  coords: LatLng
}

export interface RouteInfo {
  nombre: string
  zoneId: number | ''
  /** Días de ejecución, en el orden de DIAS. */
  dias: string[]
  frecuencia: string
  horaInicio: string // "HH:MM"
  horaFin: string
  descripcion: string
  /** YYYY-MM-DD */
  inicio: string
}

export interface RouteStop {
  clientId: number
  /** Minutos que dura la visita. El backend no la guarda: solo sirve para estimar horarios. */
  duracionVisita: number
  objetivo?: string
}

/** El backend guarda los días como texto libre ("Lunes, Miércoles"). */
export const joinDays = (dias: string[]) => DIAS.filter((d) => dias.includes(d)).join(', ')

export const splitDays = (text: string | null) =>
  (text ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)

/** Código corto de una zona para el nombre sugerido: "Zona Norte" → "NORTE". */
export function zoneCode(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter((w) => w && w !== 'ZONA')
  return (words.join('-') || 'ZONA').slice(0, 12)
}

/** Siguiente nombre libre RUT-<CODIGO>-NNN, según los nombres que ya existen. */
export function suggestRouteName(code: string, existing: string[]): string {
  const prefix = `RUT-${code}-`
  const used = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter(Number.isFinite)
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(3, '0')}`
}

/**
 * Estado de una ruta en la semana: inactiva si así está en el backend; si no,
 * según sus visitas de la semana (las canceladas no cuentan).
 */
export type WeekStatus = 'inactiva' | 'sin_visitas' | 'programada' | 'en_curso' | 'completada'

export const weekStatusLabel: Record<WeekStatus, string> = {
  inactiva: 'Inactiva',
  sin_visitas: 'Sin visitas',
  programada: 'Programada',
  en_curso: 'En curso',
  completada: 'Completada',
}

export function weekStatus(active: boolean, realizadas: number, programadas: number): WeekStatus {
  if (!active) return 'inactiva'
  if (programadas === 0) return 'sin_visitas'
  if (realizadas >= programadas) return 'completada'
  return realizadas > 0 ? 'en_curso' : 'programada'
}

// --- Usado por el servidor simulado (dashboard) ---------------------------

/** 0 = lunes … 6 = domingo */
export const todayIndex = (date = new Date()) => (date.getDay() + 6) % 7

/** Estado esperado de una ruta según su día frente al día de hoy en la semana actual. */
export function statusForDay(dia: string, date = new Date()): RouteStatus {
  const d = DIAS.indexOf(dia)
  const t = todayIndex(date)
  if (d < t) return 'completada'
  return d === t ? 'en_curso' : 'programada'
}

export function applyProgress(route: AssignedRoute, completadas: number): void {
  route.completadas = Math.min(completadas, route.stops.length)
  route.estado =
    route.completadas >= route.stops.length ? 'completada' : route.completadas > 0 ? 'en_curso' : route.estado
}
