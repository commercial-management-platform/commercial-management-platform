// Cliente HTTP para el backend NestJS (prefijo global /api).
// Todos los servicios reales pasan por aquí: agrega el token de sesión,
// normaliza los errores y avisa cuando la sesión deja de ser válida.

/** En desarrollo Vite redirige /api al backend (ver vite.config.ts). */
const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
const TIMEOUT_MS = 15_000
const OFFLINE_MESSAGE = 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'

/** Error de la API con el código HTTP; status 0 = sin conexión con el servidor. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Respuesta paginada estándar del backend (page empieza en 1). */
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

interface HttpConfig {
  getToken: () => string | null
  /** Se llama cuando una petición autenticada recibe 401 (sesión vencida o revocada). */
  onUnauthorized: () => void
}

let config: HttpConfig = { getToken: () => null, onUnauthorized: () => {} }

export function configureHttp(next: HttpConfig) {
  config = next
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  /** false para endpoints públicos (login): no envía token ni dispara onUnauthorized. */
  auth?: boolean
  signal?: AbortSignal
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, signal } = options

  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? config.getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE)
  }

  // 502-504: el proxy o balanceador no alcanzó al backend (caído o reiniciando).
  if (response.status >= 502 && response.status <= 504) throw new ApiError(0, OFFLINE_MESSAGE)

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && auth) config.onUnauthorized()
    throw new ApiError(response.status, errorMessage(payload, response.status))
  }

  return payload as T
}

/**
 * El backend responde { statusCode, error, message }; en errores de validación
 * `message` es una lista. Se devuelve el primer mensaje legible.
 */
function errorMessage(payload: unknown, status: number): string {
  const message = (payload as { message?: unknown } | null)?.message
  if (Array.isArray(message) && message.length) return String(message[0])
  if (typeof message === 'string' && message) return message
  if (status >= 500) return 'El servidor tuvo un problema. Intenta de nuevo en unos minutos.'
  return `Error ${status}`
}
