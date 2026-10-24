import type { ApiVisit } from '../services/visitsApi'

// Fechas de negocio del dashboard (HU-15) y del mapa de visitas (HU-11). Los
// indicadores y la tabla de seguimiento los calcula el backend (/dashboard).

const BUSINESS_TZ = 'America/Bogota'
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ })
const weekdayFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'long', timeZone: BUSINESS_TZ })

/** Día de negocio (YYYY-MM-DD, hora de Colombia) de una fecha ISO. */
export const businessDay = (iso: string) => dayKeyFmt.format(new Date(iso))

/** "martes" */
export const weekdayName = (iso: string) => weekdayFmt.format(new Date(iso))

const parseDay = (day: string) => new Date(`${day}T12:00:00Z`)
const toDay = (date: Date) => date.toISOString().slice(0, 10)

export function addDays(day: string, days: number): string {
  const date = parseDay(day)
  date.setUTCDate(date.getUTCDate() + days)
  return toDay(date)
}

/** Lunes y domingo de la semana que contiene `day`. */
export function weekRange(day: string): { from: string; to: string } {
  const offset = (parseDay(day).getUTCDay() + 6) % 7
  const from = addDays(day, -offset)
  return { from, to: addDays(from, 6) }
}

/** Visitas en el orden de la ruta: primero `visitOrder` y luego la hora. */
export const byRouteOrder = (a: ApiVisit, b: ApiVisit) =>
  (a.visitOrder ?? Number.MAX_SAFE_INTEGER) - (b.visitOrder ?? Number.MAX_SAFE_INTEGER) ||
  Date.parse(a.scheduledDate) - Date.parse(b.scheduledDate)
