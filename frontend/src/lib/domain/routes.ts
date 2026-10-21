import type { AssignedRoute, RouteStatus, Zona } from '../types'

export const ZONAS: { value: Zona; label: string; code: string }[] = [
  { value: 'norte', label: 'Zona norte', code: 'NORTE' },
  { value: 'centro', label: 'Zona centro', code: 'CENTRO' },
  { value: 'sur', label: 'Zona sur', code: 'SUR' },
  { value: 'occidente', label: 'Zona occidente', code: 'OCC' },
]
export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const FRECUENCIAS = ['Semanal', 'Quincenal', 'Mensual']

export const zonaLabel = (zona: Zona | '') => ZONAS.find((z) => z.value === zona)?.label ?? '—'

export const routeStatusLabel: Record<RouteStatus, string> = {
  programada: 'Programada',
  en_curso: 'En curso',
  completada: 'Completada',
}

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
