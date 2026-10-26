import { can } from '../permissions.svelte'
import { listAdvisors, type ApiAdvisor } from '../services/advisorsApi'
import { session } from './session.svelte'

/**
 * Asesores para mostrar nombres y asignar trabajo. Solo el gestor los consulta
 * (el asesor recibe 403): para el asesor, todo lo que ve es suyo.
 */
class AdvisorsStore {
  list = $state<ApiAdvisor[]>([])
  byId = $derived(new Map(this.list.map((a) => [a.id, a])))
  /** Los que se pueden asignar a algo nuevo. */
  active = $derived(this.list.filter((a) => a.status === 'active'))

  #owner: string | null = null
  #pending: Promise<void> | null = null

  load() {
    const owner = session.current?.user.id ?? null
    if (owner === this.#owner) return this.#pending ?? Promise.resolve()
    this.#owner = owner
    this.list = []
    if (!can.isManager) return Promise.resolve()
    // Inactivos incluidos: lo antiguo sigue mostrando el nombre.
    this.#pending = listAdvisors(true)
      .then((list) => void (this.list = list))
      .catch(() => {
        this.#owner = null
      })
      .finally(() => (this.#pending = null))
    return this.#pending
  }

  name(advisorId: number) {
    if (can.isAdvisor) return session.current?.user.name ?? 'Tú'
    // "…" mientras carga; el id solo si el asesor no está en la lista.
    return this.byId.get(advisorId)?.name ?? (this.list.length ? `Asesor #${advisorId}` : '…')
  }
}

export const advisors = new AdvisorsStore()
