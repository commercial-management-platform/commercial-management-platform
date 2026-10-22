import { untrack } from 'svelte'
import { can } from '../permissions.svelte'
import { listClients, type ApiClient } from '../services/clientsApi'
import { ApiError } from '../services/http'
import { listUsers, type ApiUser } from '../services/usersApi'
import { dashboard } from './dashboard.svelte'
import { session } from './session.svelte'

/** El backend aún no emite eventos: mientras "En vivo" esté activo se consulta cada 30 s. */
const POLL_MS = 30_000
const HIGHLIGHT_MS = 2400

/**
 * Cartera de clientes con datos reales del backend, para el dashboard.
 * Detecta clientes nuevos o modificados entre consultas y los resalta.
 */
class PortfolioStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  error = $state('')
  clients = $state<ApiClient[]>([])
  /** Solo se cargan si el rol puede consultar usuarios (ver `can.listUsers`). */
  users = $state<ApiUser[] | null>(null)
  updatedAt = $state<Date | null>(null)
  highlights = $state<Record<string, boolean>>({})

  totals = $derived.by(() => {
    const now = new Date()
    const active = this.clients.filter((c) => c.active)
    return {
      total: this.clients.length,
      active: active.length,
      inactive: this.clients.length - active.length,
      newThisMonth: this.clients.filter((c) => {
        const d = new Date(c.createdAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length,
      located: this.clients.filter((c) => c.latitude !== null && c.longitude !== null).length,
    }
  })

  advisors = $derived(this.users?.filter((u) => u.role === 'advisor' && u.isActive).length ?? null)

  recent = $derived(this.clients.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5))

  byMunicipality = $derived.by(() => {
    const counts = new Map<string, number>()
    for (const c of this.clients) {
      const key = c.municipality ?? 'Sin municipio'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  })

  #timer: ReturnType<typeof setInterval> | null = null
  #loading = false
  #owner: string | null = null

  async refresh() {
    if (this.#loading) return
    // Si cambió el usuario (otro inicio de sesión), no se muestran datos del anterior.
    const owner = session.current?.user.id ?? null
    if (owner !== this.#owner) {
      this.#owner = owner
      this.clients = []
      this.users = null
      this.status = 'idle'
    }
    this.#loading = true
    if (this.status !== 'ready') this.status = 'loading'
    try {
      const [clients, users] = await Promise.all([
        listClients(),
        can.listUsers ? listUsers().catch(() => null) : Promise.resolve(null),
      ])
      if (this.status === 'ready') this.#flashChanges(clients)
      this.clients = clients
      this.users = users
      this.updatedAt = new Date()
      this.status = 'ready'
      this.error = ''
    } catch (error) {
      // Si ya había datos se conservan; solo se informa el problema.
      this.error = error instanceof ApiError ? error.message : 'No pudimos cargar la cartera de clientes.'
      if (this.status !== 'ready') this.status = 'error'
    } finally {
      this.#loading = false
    }
  }

  start() {
    this.refresh()
    this.#timer ??= setInterval(() => this.refresh(), POLL_MS)
  }

  stop() {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = null
  }

  #flashChanges(next: ApiClient[]) {
    const previous = new Map(this.clients.map((c) => [c.id, c.updatedAt]))
    for (const client of next) {
      if (previous.get(client.id) !== client.updatedAt) {
        const key = String(client.id)
        this.highlights[key] = true
        setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
      }
    }
  }
}

export const portfolio = new PortfolioStore()

/** Consulta periódica mientras el componente esté montado y "En vivo" esté activo. */
export function useLivePortfolio() {
  $effect(() => {
    if (!dashboard.live) {
      // En pausa: una sola carga para no dejar la sección vacía.
      untrack(() => portfolio.status === 'idle' && portfolio.refresh())
      return
    }
    untrack(() => portfolio.start())
    return () => portfolio.stop()
  })
}
