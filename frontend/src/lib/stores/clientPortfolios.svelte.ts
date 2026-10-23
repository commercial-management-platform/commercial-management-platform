import {
  addClientToPortfolio,
  listPortfolioClients,
  listPortfolios,
  removeClientFromPortfolio,
  type ApiPortfolio,
} from '../services/portfoliosApi'
import { clientDirectory } from './clientDirectory.svelte'
import { session } from './session.svelte'

/**
 * Portafolios (HU-06) y a cuáles pertenece cada cliente. El backend no expone
 * "portafolios de un cliente", así que se arma el índice inverso a partir de los
 * clientes de cada portafolio (son pocos y sembrados).
 */
class ClientPortfoliosStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  portfolios = $state<ApiPortfolio[]>([])
  /** clientId -> ids de los portafolios donde está. */
  membership = $state<Record<number, number[]>>({})

  byId = $derived(new Map(this.portfolios.map((p) => [p.id, p])))

  #pending: Promise<void> | null = null
  #owner: string | null = null

  load(force = false) {
    // Otro usuario puede ver otros clientes (el asesor solo los de sus rutas).
    const owner = session.current?.user.id ?? null
    if (owner !== this.#owner) {
      this.#owner = owner
      this.status = 'idle'
    }
    if (this.status === 'ready' && !force) return Promise.resolve()
    this.#pending ??= this.#fetch().finally(() => (this.#pending = null))
    return this.#pending
  }

  of(clientId: number): ApiPortfolio[] {
    return (this.membership[clientId] ?? []).flatMap((id) => this.byId.get(id) ?? [])
  }

  async add(portfolioId: number, clientId: number) {
    await addClientToPortfolio(portfolioId, clientId)
    this.membership[clientId] = [...(this.membership[clientId] ?? []), portfolioId]
    clientDirectory.invalidateActivity(clientId)
  }

  async remove(portfolioId: number, clientId: number) {
    await removeClientFromPortfolio(portfolioId, clientId)
    this.membership[clientId] = (this.membership[clientId] ?? []).filter((id) => id !== portfolioId)
    clientDirectory.invalidateActivity(clientId)
  }

  async #fetch() {
    if (this.status !== 'ready') this.status = 'loading'
    try {
      const portfolios = await listPortfolios()
      const members = await Promise.all(portfolios.map((p) => listPortfolioClients(p.id)))
      const membership: Record<number, number[]> = {}
      portfolios.forEach((portfolio, i) => {
        for (const client of members[i]) (membership[client.id] ??= []).push(portfolio.id)
      })
      this.portfolios = portfolios
      this.membership = membership
      this.status = 'ready'
    } catch {
      if (this.status !== 'ready') this.status = 'error'
    }
  }
}

export const clientPortfolios = new ClientPortfoliosStore()
