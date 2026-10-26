const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const dateFmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
const shortMonth = new Intl.DateTimeFormat('es-CO', { month: 'short' })

export const formatMoney = (value: number) => money.format(value)

/** 215000 -> "215K", 1250000 -> "1.3M" */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(Math.round(value))
}

export const formatDate = (iso: string) => dateFmt.format(new Date(iso))

export const formatTime = (date: Date | string) => timeFmt.format(new Date(date))

export const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

/** Variación porcentual contra el periodo anterior. */
export const delta = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0

/** "08:30" -> 510 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** 510 -> "08:30" */
export function fromMinutes(total: number): string {
  const m = Math.round(total) % (24 * 60)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 135 -> "2h 15m" */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export const formatKm = (meters: number) => `${(meters / 1000).toFixed(1)} km`

const WEEKDAYS_ES: Record<string, string> = {
  Monday: 'Lunes',
  Tuesday: 'Martes',
  Wednesday: 'Miércoles',
  Thursday: 'Jueves',
  Friday: 'Viernes',
  Saturday: 'Sábado',
  Sunday: 'Domingo',
}

/** El backend responde el día de la semana en inglés ('Sunday'). */
export const weekdayEs = (weekday: string) => WEEKDAYS_ES[weekday] ?? weekday

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Rango lunes–domingo de la semana actual, p. ej. "19 – 25 oct". */
export function currentWeekLabel(date = new Date()): string {
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const month = shortMonth.format(sunday).replace('.', '')
  const startMonth = monday.getMonth() !== sunday.getMonth() ? ` ${shortMonth.format(monday).replace('.', '')}` : ''
  return `${monday.getDate()}${startMonth} – ${sunday.getDate()} ${month}`
}

const dayMonth = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })

/** "21 oct" */
export const formatShortDate = (iso: string) => dayMonth.format(new Date(iso)).replace(' de ', ' ').replace('.', '')
