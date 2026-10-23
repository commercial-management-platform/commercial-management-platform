import { listCatalog, type CatalogEntry, type ClientCatalog, type VisitCatalog } from '../services/catalogsApi'

/**
 * Catálogos de cliente (zonas, tipos, potenciales y estados). Cambian muy poco
 * y son iguales para todos los roles (solo entradas activas), así que se cargan
 * una vez y se comparten entre pantallas.
 */
class CatalogsStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  zones = $state<CatalogEntry[]>([])
  clientTypes = $state<CatalogEntry[]>([])
  potentials = $state<CatalogEntry[]>([])
  clientStatuses = $state<CatalogEntry[]>([])

  #names = $derived({
    zones: toNames(this.zones),
    clientTypes: toNames(this.clientTypes),
    potentials: toNames(this.potentials),
    clientStatuses: toNames(this.clientStatuses),
  })

  #pending: Promise<void> | null = null

  load() {
    if (this.status === 'ready') return Promise.resolve()
    this.#pending ??= this.#fetch().finally(() => (this.#pending = null))
    return this.#pending
  }

  /** Tras editar un catálogo (zonas): la próxima carga vuelve a pedirlo. */
  invalidate() {
    this.status = 'idle'
    return this.load()
  }

  /** Nombre de una entrada por id; '' si no tiene o el catálogo aún no carga. */
  name(catalog: ClientCatalog, id: number | null) {
    return id === null ? '' : (this.#names[catalog].get(id) ?? '')
  }

  async #fetch() {
    this.status = 'loading'
    try {
      const [zones, clientTypes, potentials, clientStatuses] = await Promise.all([
        listCatalog('zones'),
        listCatalog('clientTypes'),
        listCatalog('potentials'),
        listCatalog('clientStatuses'),
      ])
      this.zones = zones
      this.clientTypes = clientTypes
      this.potentials = potentials.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
      this.clientStatuses = clientStatuses
      this.status = 'ready'
    } catch {
      this.status = 'error'
    }
  }
}

function toNames(entries: CatalogEntry[]) {
  return new Map(entries.map((e) => [e.id, e.name]))
}

export const catalogs = new CatalogsStore()

/** Catálogos del formulario de visita (HU-09): resultados, objetivos y tipos. Solo los usa el asesor. */
class VisitCatalogsStore {
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  visitResults = $state<CatalogEntry[]>([])
  visitObjectives = $state<CatalogEntry[]>([])
  visitTypes = $state<CatalogEntry[]>([])

  #names = $derived({
    visitResults: toNames(this.visitResults),
    visitObjectives: toNames(this.visitObjectives),
    visitTypes: toNames(this.visitTypes),
  })

  #pending: Promise<void> | null = null

  load() {
    if (this.status === 'ready') return Promise.resolve()
    this.#pending ??= this.#fetch().finally(() => (this.#pending = null))
    return this.#pending
  }

  name(catalog: VisitCatalog, id: number | null) {
    return id === null ? '' : (this.#names[catalog].get(id) ?? '')
  }

  async #fetch() {
    this.status = 'loading'
    try {
      const [visitResults, visitObjectives, visitTypes] = await Promise.all([
        listCatalog('visitResults'),
        listCatalog('visitObjectives'),
        listCatalog('visitTypes'),
      ])
      this.visitResults = visitResults
      this.visitObjectives = visitObjectives
      this.visitTypes = visitTypes
      this.status = 'ready'
    } catch {
      this.status = 'error'
    }
  }
}

export const visitCatalogs = new VisitCatalogsStore()
