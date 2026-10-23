import { untrack } from 'svelte'
import { ApiError, type Paginated } from '../services/http'
import { dashboard } from './dashboard.svelte'
import { session } from './session.svelte'

/** El backend aún no emite eventos: mientras "En vivo" esté activo se consulta cada 30 s. */
const POLL_MS = 30_000
const HIGHLIGHT_MS = 2400
/** Máximo que acepta el backend por página. */
const PAGE_LIMIT = 100

/** Todas las páginas de un listado paginado del backend. */
export async function fetchAllPages<T>(list: (page: number, limit: number) => Promise<Paginated<T>>): Promise<T[]> {
  const first = await list(1, PAGE_LIMIT)
  const pages = Math.ceil(first.total / PAGE_LIMIT)
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => list(i + 2, PAGE_LIMIT)))
  return [first, ...rest].flatMap((p) => p.data)
}

/**
 * Colección del backend que se mantiene al día consultando cada 30 s y resalta
 * lo nuevo o modificado entre consultas. Base de cotizaciones y pedidos.
 */
export class LiveCollection<T extends { id: number; updatedAt: string }> {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  error = $state('')
  items = $state<T[]>([])
  highlights = $state<Record<string, boolean>>({})

  byId = $derived(new Map(this.items.map((item) => [item.id, item])))

  #fetch: () => Promise<T[]>
  #fallback: string
  #timer: ReturnType<typeof setInterval> | null = null
  #loading = false
  #owner: string | null = null

  constructor(fetch: () => Promise<T[]>, fallback: string) {
    this.#fetch = fetch
    this.#fallback = fallback
  }

  async refresh() {
    if (this.#loading) return
    // Si cambió el usuario (otro inicio de sesión), no se muestran datos del anterior.
    const owner = session.current?.user.id ?? null
    if (owner !== this.#owner) {
      this.#owner = owner
      this.items = []
      this.status = 'idle'
    }
    this.#loading = true
    if (this.status !== 'ready') this.status = 'loading'
    try {
      const items = await this.#fetch()
      if (this.status === 'ready') this.#flashChanges(items)
      this.items = items
      this.status = 'ready'
      this.error = ''
    } catch (error) {
      // Si ya había datos se conservan; solo se informa el problema.
      this.error = error instanceof ApiError ? error.message : this.#fallback
      if (this.status !== 'ready') this.status = 'error'
    } finally {
      this.#loading = false
    }
  }

  /** Consulta periódica mientras el componente que lo llama esté montado (respeta la pausa global). */
  use() {
    $effect(() => {
      if (!dashboard.live) {
        // En pausa: una sola carga para no dejar la pantalla vacía.
        untrack(() => this.status === 'idle' && this.refresh())
        return
      }
      untrack(() => {
        this.refresh()
        this.#timer ??= setInterval(() => this.refresh(), POLL_MS)
      })
      return () => {
        if (this.#timer) clearInterval(this.#timer)
        this.#timer = null
      }
    })
  }

  /** Agrega o reemplaza un elemento tras crearlo o cambiarlo desde esta pantalla. */
  upsert(item: T) {
    this.items = this.byId.has(item.id) ? this.items.map((i) => (i.id === item.id ? item : i)) : [item, ...this.items]
    this.flash(String(item.id))
    this.flash('kpi')
  }

  flash(key: string) {
    this.highlights[key] = true
    setTimeout(() => delete this.highlights[key], HIGHLIGHT_MS)
  }

  #flashChanges(next: T[]) {
    const previous = new Map(this.items.map((i) => [i.id, i.updatedAt]))
    let changed = false
    for (const item of next) {
      if (previous.get(item.id) !== item.updatedAt) {
        this.flash(String(item.id))
        changed = true
      }
    }
    if (changed || next.length !== previous.size) this.flash('kpi')
  }
}
