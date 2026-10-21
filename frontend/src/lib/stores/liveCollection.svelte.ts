import { untrack } from 'svelte'
import { api } from '../services/api'
import type { LiveEvent } from '../types'
import { dashboard } from './dashboard.svelte'

const HIGHLIGHT_MS = 2400

/**
 * Colección de documentos sincronizada en tiempo real: carga una foto inicial
 * y aplica los eventos que le interesan. Base de cotizaciones y pedidos.
 */
export class LiveCollection<T extends { id: string }> {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  items = $state<T[]>([])
  highlights = $state<Record<string, boolean>>({})

  byId = $derived(new Map(this.items.map((item) => [item.id, item])))

  #fetch: () => Promise<T[]>
  #handle: (event: LiveEvent) => void
  #unsubscribe: (() => void) | null = null
  #connecting = false

  constructor(fetch: () => Promise<T[]>, handle: (event: LiveEvent) => void) {
    this.#fetch = fetch
    this.#handle = handle
  }

  async connect() {
    if (this.#unsubscribe || this.#connecting) return
    this.#connecting = true
    if (this.status !== 'ready') this.status = 'loading'
    try {
      this.items = await this.#fetch()
      this.status = 'ready'
      this.#unsubscribe = api.subscribe((event) => this.#handle(event))
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

  /** Mantiene la conexión mientras el componente que lo llama esté montado (respeta la pausa global). */
  use() {
    $effect(() => {
      if (!dashboard.live) return
      // untrack: connect() lee `status`; sin esto el efecto se re-ejecutaría al terminar de cargar.
      untrack(() => this.connect())
      return () => this.disconnect()
    })
  }

  add(item: T) {
    if (this.byId.has(item.id)) return false
    this.items = [item, ...this.items]
    this.flash(item.id)
    return true
  }

  patch(id: string, patch: Partial<T>) {
    const item = this.byId.get(id)
    if (!item) return null
    Object.assign(item, patch)
    this.flash(id)
    return item
  }

  flash(key: string) {
    this.highlights[key] = true
    setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
  }
}
