import { ApiError, http } from './http'

// Clientes del backend (/api/clients). Admin y director ven todos;
// un asesor solo ve los clientes de sus rutas.

/** ClientResponseDto del backend. Los ids de catálogo apuntan a /catalogs/* (HU-05). */
export interface ApiClient {
  id: number
  nit: string
  businessName: string
  tradeName: string | null
  address: string | null
  department: string | null
  municipality: string | null
  neighborhood: string | null
  phone: string | null
  email: string | null
  zoneId: number | null
  clientTypeId: number | null
  clientPotentialId: number | null
  clientStatusId: number | null
  visitFrequencyDays: number | null
  latitude: number | null
  longitude: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ListClientsQuery {
  search?: string
  active?: boolean
  zoneId?: number
  clientTypeId?: number
  clientPotentialId?: number
  clientStatusId?: number
}

/** Campos editables. En una edición, null borra el valor; en una creación se omiten los vacíos. */
export type ClientPayload = Omit<ApiClient, 'id' | 'active' | 'createdAt' | 'updatedAt'>

/** NIT colombiano como lo valida el backend: 9 dígitos y dígito de verificación opcional. */
export const NIT_PATTERN = /^[0-9]{9}(-?[0-9])?$/

export const listClients = (query: ListClientsQuery = {}) => http<ApiClient[]>('/clients', { query: { ...query } })

export const getClient = (id: number) => http<ApiClient>(`/clients/${id}`)

/** Solo admin y director. Un NIT repetido responde 409. */
export const createClient = (payload: ClientPayload) =>
  http<ApiClient>('/clients', { method: 'POST', body: withoutNulls(payload) })

export const updateClient = (id: number, payload: Partial<ClientPayload>) =>
  http<ApiClient>(`/clients/${id}`, { method: 'PATCH', body: payload })

/** Solo admin y director. Desactivar no borra el cliente ni su historial. */
export const setClientActive = (id: number, active: boolean) =>
  http<ApiClient>(`/clients/${id}/status`, { method: 'PATCH', body: { active } })

// --- Importación masiva desde CSV (HU-22). Solo admin y director. ---------------

/** Límites del backend: 2 MB y 5.000 filas. */
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024
/** Validar miles de filas toma más que una petición normal. */
const IMPORT_TIMEOUT_MS = 60_000

export interface ClientImportError {
  /** Número de fila del archivo (la 1 es el encabezado). */
  rowNumber: number
  column: string
  /** Motivo en inglés, tal como lo genera el backend. */
  reason: string
}

export interface ClientImportReport {
  totalRows: number
  importedRows: number
  errorRows: number
  /** validated = dryRun sin errores; failed = nada se guardó (todo o nada). */
  status: 'validated' | 'imported' | 'failed'
  errors: ClientImportError[]
}

/** Plantilla CSV con los encabezados esperados y una fila de ejemplo. */
export const downloadImportTemplate = () => http<Blob>('/clients/import/template', { responseType: 'blob' })

/**
 * Con `dryRun` solo valida. Si alguna fila tiene errores el backend responde 400
 * con el mismo reporte: aquí se devuelve como resultado, no como excepción.
 */
export async function importClients(file: File, dryRun: boolean): Promise<ClientImportReport> {
  const form = new FormData()
  form.append('file', file)
  try {
    return await http<ClientImportReport>('/clients/import', {
      method: 'POST',
      body: form,
      query: { dryRun: dryRun || undefined },
      signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof ApiError && isImportReport(error.body)) return error.body
    throw error
  }
}

function isImportReport(body: unknown): body is ClientImportReport {
  return typeof body === 'object' && body !== null && Array.isArray((body as ClientImportReport).errors)
}

/** Nombre a mostrar: el comercial si existe, si no la razón social. */
export const clientDisplayName = (client: ApiClient) => client.tradeName || client.businessName

/** El POST no acepta null: los campos vacíos simplemente no se envían. */
function withoutNulls<T extends object>(payload: T): Partial<T> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null)) as Partial<T>
}
