import { untrack } from 'svelte'
import {
  clientDisplayName,
  createClient,
  listClients,
  setClientActive,
  updateClient,
  type ApiClient,
  type ClientPayload,
} from '../services/clientsApi'
import { listClientActivity, type ApiActivityEntry } from '../services/activityApi'
import { createContact, listContacts, updateContact, type ApiContact, type ContactPayload } from '../services/contactsApi'
import { ApiError } from '../services/http'
import { catalogs } from './catalogs.svelte'
import { dashboard } from './dashboard.svelte'
import { session } from './session.svelte'
import { toasts } from './toasts.svelte'

/** El backend aún no emite eventos: mientras "En vivo" esté activo se consulta cada 30 s. */
const POLL_MS = 30_000
const HIGHLIGHT_MS = 2400
/** Entradas de historial que se muestran en el detalle del cliente. */
const ACTIVITY_LIMIT = 8

/**
 * Cartera de clientes del backend para la pantalla Clientes (HU-03).
 * Las cotizaciones, pedidos y visitas siguen usando `clientsStore` (mock)
 * hasta que existan esos módulos en el backend.
 */
class ClientDirectoryStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  error = $state('')
  clients = $state<ApiClient[]>([])
  /** Contactos por cliente; se cargan al abrir su detalle. */
  contacts = $state<Record<number, ApiContact[]>>({})
  /** Últimas entradas del historial (HU-16) por cliente; se cargan al abrir su detalle. */
  activity = $state<Record<number, { entries: ApiActivityEntry[]; total: number }>>({})
  highlights = $state<Record<string, boolean>>({})

  byId = $derived(new Map(this.clients.map((c) => [c.id, c])))

  totals = $derived.by(() => {
    const now = new Date()
    return {
      total: this.clients.length,
      active: this.clients.filter((c) => c.active).length,
      newThisMonth: this.clients.filter((c) => {
        const d = new Date(c.createdAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length,
    }
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
      this.contacts = {}
      this.activity = {}
      this.status = 'idle'
    }
    this.#loading = true
    if (this.status !== 'ready') this.status = 'loading'
    try {
      const [clients] = await Promise.all([listClients(), catalogs.load()])
      if (this.status === 'ready') this.#flashChanges(clients)
      this.clients = clients
      this.status = 'ready'
      this.error = ''
    } catch (error) {
      // Si ya había datos se conservan; solo se informa el problema.
      this.error = errorText(error, 'No pudimos cargar los clientes.')
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

  async loadContacts(clientId: number, force = false) {
    if (this.contacts[clientId] && !force) return
    this.contacts[clientId] = await listContacts(clientId)
  }

  async loadActivity(clientId: number) {
    if (this.activity[clientId]) return
    const page = await listClientActivity(clientId, 1, ACTIVITY_LIMIT)
    this.activity[clientId] = { entries: page.data, total: page.total }
  }

  /** Tras un cambio el backend registra una entrada nueva: se vuelve a pedir al abrir el detalle. */
  invalidateActivity(clientId: number) {
    delete this.activity[clientId]
  }

  async create(payload: ClientPayload, contact: ContactPayload | null) {
    const client = await createClient(payload)
    this.#upsert(client)
    this.#flash('kpi:total')
    this.#flash('kpi:newThisMonth')
    if (client.active) this.#flash('kpi:active')
    toasts.push({ tone: 'success', icon: 'users', title: 'Cliente creado', message: clientDisplayName(client) })
    // El cliente ya quedó guardado: un fallo en el contacto se avisa sin deshacerlo.
    if (contact) await this.saveContact(client.id, null, { ...contact, isPrimary: true })
    return client
  }

  async update(clientId: number, payload: Partial<ClientPayload>) {
    const client = await updateClient(clientId, payload)
    this.#upsert(client)
    this.invalidateActivity(clientId)
    return client
  }

  async setActive(clientId: number, active: boolean) {
    const client = await setClientActive(clientId, active)
    this.#upsert(client)
    this.invalidateActivity(clientId)
    this.#flash('kpi:active')
    toasts.push({
      tone: active ? 'success' : 'info',
      icon: active ? 'check' : 'alert-circle',
      title: active ? 'Cliente reactivado' : 'Cliente desactivado',
      message: clientDisplayName(client),
    })
    return client
  }

  /** Crea el contacto si no hay `contactId`; si no, lo actualiza. Avisa por toast si falla. */
  async saveContact(clientId: number, contactId: number | null, payload: ContactPayload) {
    try {
      if (contactId === null) await createContact(clientId, payload)
      else await updateContact(clientId, contactId, payload)
      await this.loadContacts(clientId, true)
      this.invalidateActivity(clientId)
      return true
    } catch (error) {
      toasts.push({
        tone: 'warning',
        icon: 'alert-circle',
        title: 'No se pudo guardar el contacto',
        message: errorText(error, 'Intenta de nuevo.'),
      })
      return false
    }
  }

  #upsert(client: ApiClient) {
    const index = this.clients.findIndex((c) => c.id === client.id)
    if (index === -1) this.clients = [client, ...this.clients]
    else this.clients[index] = client
    this.#flash(String(client.id))
  }

  #flash(key: string) {
    this.highlights[key] = true
    setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
  }

  #flashChanges(next: ApiClient[]) {
    const previous = new Map(this.clients.map((c) => [c.id, c.updatedAt]))
    for (const client of next) {
      if (previous.get(client.id) !== client.updatedAt) {
        this.#flash(String(client.id))
        this.invalidateActivity(client.id)
      }
    }
  }
}

export function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export const clientDirectory = new ClientDirectoryStore()

/** Consulta periódica mientras el componente esté montado y "En vivo" esté activo. */
export function useClientDirectory() {
  $effect(() => {
    if (!dashboard.live) {
      // En pausa: una sola carga para no dejar la pantalla vacía.
      untrack(() => clientDirectory.status === 'idle' && clientDirectory.refresh())
      return
    }
    untrack(() => clientDirectory.start())
    return () => clientDirectory.stop()
  })
}
