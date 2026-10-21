import { untrack } from 'svelte'
import { EN_PROCESO } from '../domain/clients'
import { api } from '../services/api'
import type { Client, ClientInput, HistoryEntry, LiveEvent } from '../types'
import { dashboard } from './dashboard.svelte'
import { session } from './session.svelte'
import { toasts } from './toasts.svelte'

const HIGHLIGHT_MS = 2400

/** Cartera de clientes, alimentada en tiempo real como el resto de la app. */
class ClientsStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  clients = $state<Client[]>([])
  /** Historial por cliente; se carga al abrir su detalle y luego crece en vivo. */
  histories = $state<Record<string, HistoryEntry[]>>({})
  highlights = $state<Record<string, boolean>>({})

  byId = $derived(new Map(this.clients.map((c) => [c.id, c])))

  totals = $derived.by(() => {
    const now = new Date()
    return {
      total: this.clients.length,
      enProceso: this.clients.filter((c) => EN_PROCESO.includes(c.estado)).length,
      esteMes: this.clients.filter((c) => {
        const d = new Date(c.creadoEn)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }).length,
    }
  })

  #unsubscribe: (() => void) | null = null
  #connecting = false

  async connect() {
    if (this.#unsubscribe || this.#connecting) return
    this.#connecting = true
    if (this.status !== 'ready') this.status = 'loading'
    try {
      this.clients = await api.fetchClients()
      this.histories = {}
      this.status = 'ready'
      this.#unsubscribe = api.subscribe((event) => this.#apply(event))
    } catch {
      this.status = 'error'
    } finally {
      this.#connecting = false
    }
  }

  disconnect() {
    this.#unsubscribe?.()
    this.#unsubscribe = null
  }

  async loadHistory(clientId: string) {
    if (this.histories[clientId]) return
    this.histories[clientId] = await api.fetchClientHistory(clientId)
  }

  create(input: ClientInput) {
    // El cliente aparece en la tabla cuando llega el evento 'client.created'.
    return api.createClient($state.snapshot(input), session.current?.user.name ?? 'Usuario')
  }

  update(clientId: string, input: ClientInput) {
    return api.updateClient(clientId, $state.snapshot(input), session.current?.user.name ?? 'Usuario')
  }

  #flash(key: string) {
    this.highlights[key] = true
    setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
  }

  #apply(event: LiveEvent) {
    switch (event.type) {
      case 'client.created': {
        if (this.byId.has(event.client.id)) break
        this.clients = [event.client, ...this.clients]
        this.histories[event.client.id] = [event.entry]
        this.#flash(event.client.id)
        this.#flash('kpi:total')
        this.#flash('kpi:esteMes')
        if (EN_PROCESO.includes(event.client.estado)) this.#flash('kpi:enProceso')
        toasts.push({
          tone: 'info',
          icon: 'users',
          title: 'Nuevo cliente',
          message: `${event.client.nombre} · ${event.client.municipio}`,
        })
        break
      }
      case 'client.updated': {
        const client = this.byId.get(event.clientId)
        if (!client) break
        const wasInProcess = EN_PROCESO.includes(client.estado)
        Object.assign(client, event.patch)
        if (event.entry) this.histories[event.clientId]?.unshift(event.entry)
        this.#flash(client.id)
        if (wasInProcess !== EN_PROCESO.includes(client.estado)) this.#flash('kpi:enProceso')
        break
      }
    }
  }
}

export const clientsStore = new ClientsStore()

/** Mantiene la conexión en vivo mientras el componente esté montado (respeta la pausa global). */
export function useLiveClients() {
  $effect(() => {
    if (!dashboard.live) return
    // untrack: connect() lee `status`; sin esto el efecto se re-ejecutaría al terminar de cargar.
    untrack(() => clientsStore.connect())
    return () => clientsStore.disconnect()
  })
}
