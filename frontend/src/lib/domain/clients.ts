import type { ClientStatus, Potencial } from '../types'

export const SEGMENTOS = ['Industrial', 'Tecnología', 'Retail', 'Distribuidor', 'Servicios']
export const MUNICIPIOS = ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Galapa']
export const POTENCIALES: Potencial[] = ['Alto', 'Medio', 'Bajo']
export const FRECUENCIAS_VISITA = [7, 15, 30, 60]

export const clientStatusLabel: Record<ClientStatus, string> = {
  activo: 'Activo',
  seguimiento: 'Seguimiento',
  prospecto: 'Prospecto',
  inactivo: 'Inactivo',
}

/**
 * Clase de color para un estado del catálogo del backend (client-statuses).
 * El catálogo es editable, así que un nombre desconocido usa el tono neutro.
 */
export function clientStatusTone(name: string): ClientStatus | 'neutral' {
  const key = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  return (Object.keys(clientStatusLabel) as ClientStatus[]).find((s) => s === key) ?? 'neutral'
}

/** Clientes "en proceso": aún no compran de forma recurrente. */
export const EN_PROCESO: ClientStatus[] = ['seguimiento', 'prospecto']

const DAY = 86_400_000

/** Fecha sugerida de la próxima visita según la frecuencia del cliente. */
export function nextVisit(ultimaVisita: string | null, frecuencia: number): Date | null {
  return ultimaVisita ? new Date(new Date(ultimaVisita).getTime() + frecuencia * DAY) : null
}

/** true si ya pasó la fecha en que debía visitarse. */
export function isOverdue(ultimaVisita: string | null, frecuencia: number, now = Date.now()): boolean {
  const next = nextVisit(ultimaVisita, frecuencia)
  return !!next && next.getTime() < now
}
