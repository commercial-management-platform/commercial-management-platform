<script lang="ts">
  import FiltersMenu from '../../lib/components/FiltersMenu.svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import Pagination from '../../lib/components/Pagination.svelte'
  import StatCard from '../../lib/components/StatCard.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import { QUOTE_STATUS_LABELS, type QuoteStatus } from '../../lib/services/quotesApi'
  import { advisors } from '../../lib/stores/advisors.svelte'
  import { clientDirectory, useClientDirectory } from '../../lib/stores/clientDirectory.svelte'
  import { ordersStore, quoteTotals, quotesStore } from '../../lib/stores/commerce.svelte'
  import { downloadCsv } from '../../lib/utils/csv'
  import { formatCompact, formatDate, formatMoney, formatShortDate } from '../../lib/utils/format'
  import QuoteDrawer from './QuoteDrawer.svelte'
  import QuoteFormModal from './QuoteFormModal.svelte'
  import { quoteBadge } from './badges'

  // Cotizaciones del backend (HU-12, HU-13). Los clientes y asesores se usan
  // para mostrar nombres; los pedidos, para saber qué cotización ya tiene uno.
  quotesStore.use()
  ordersStore.use()
  useClientDirectory()
  advisors.load()

  const PAGE_SIZE = 10
  const STATUSES = Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]

  let query = $state('')
  let statuses = $state<QuoteStatus[]>([])
  let page = $state(0)
  let detailId = $state<number | null>(null)
  let formOpen = $state(false)

  let totals = $derived(quoteTotals())
  let detail = $derived(detailId === null ? null : (quotesStore.byId.get(detailId) ?? null))

  const clientName = (id: number) => {
    const client = clientDirectory.byId.get(id)
    return client ? clientDisplayName(client) : `Cliente #${id}`
  }
  /** Fechas de calendario (YYYY-MM-DD): se fijan al mediodía para que la zona horaria no cambie el día. */
  const day = (date: string) => `${date}T12:00:00`

  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return quotesStore.items
      .filter(
        (quote) =>
          (statuses.length === 0 || statuses.includes(quote.status)) &&
          (!q || `${quote.number} ${clientName(quote.clientId)}`.toLowerCase().includes(q)),
      )
      .toSorted((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  })
  let visible = $derived(rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE))

  $effect(() => {
    void [query, statuses]
    page = 0
  })

  function toggle(status: QuoteStatus) {
    statuses = statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
  }

  function exportCsv() {
    downloadCsv(
      `kestrel-cotizaciones-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Cotización', 'Cliente', 'Asesor', 'Fecha', 'Valor', 'Moneda', 'Estado'],
      rows.map((q) => [
        q.number,
        clientName(q.clientId),
        advisors.name(q.advisorId),
        formatDate(day(q.date)),
        q.value,
        q.currency,
        QUOTE_STATUS_LABELS[q.status],
      ]),
    )
  }
</script>

<div class="list-page">
  <header class="page-intro">
    <div>
      <p class="eyebrow">Proceso comercial</p>
      <h1>Cotizaciones</h1>
      <p class="subtitle">Controla propuestas, importes y aprobaciones.</p>
    </div>
    <button class="btn btn-primary" onclick={() => (formOpen = true)}>
      <Icon name="plus" size={16} strokeWidth={2.2} /> Nueva cotización
    </button>
  </header>

  {#if quotesStore.status === 'ready'}
    <div class="stats-grid">
      <StatCard label="Total" value={totals.total} flash={quotesStore.highlights.kpi} />
      <StatCard label="En proceso" value={totals.enProceso} flash={quotesStore.highlights.kpi} />
      <StatCard label="Este mes" value={totals.esteMes} format={(v) => `$${formatCompact(v)}`} flash={quotesStore.highlights.kpi} />
    </div>

    <section class="card">
      <div class="table-toolbar">
        <label class="search-field">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Buscar en cotizaciones…" bind:value={query} />
        </label>
        <div class="actions">
          <FiltersMenu count={statuses.length} onclear={() => (statuses = [])}>
            <p class="filter-title">Estado</p>
            {#each STATUSES as status (status)}
              <label class="filter-check">
                <input type="checkbox" checked={statuses.includes(status)} onchange={() => toggle(status)} />
                {QUOTE_STATUS_LABELS[status]}
              </label>
            {/each}
          </FiltersMenu>
          <button class="btn btn-outline" onclick={exportCsv} disabled={rows.length === 0}>
            <Icon name="download" size={16} /> Exportar
          </button>
        </div>
      </div>

      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cotización</th>
              <th>Cliente</th>
              <th>Asesor</th>
              <th>Fecha</th>
              <th>Valor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each visible as quote (quote.id)}
              <tr class:flash={quotesStore.highlights[quote.id]}>
                <td class="strong">{quote.number}</td>
                <td>{clientName(quote.clientId)}</td>
                <td>{advisors.name(quote.advisorId)}</td>
                <td class="num">{formatShortDate(day(quote.date))}</td>
                <td class="num">{formatMoney(Number(quote.value))}</td>
                <td><span class="badge {quoteBadge[quote.status]}">{QUOTE_STATUS_LABELS[quote.status]}</span></td>
                <td><button class="link-btn" onclick={() => (detailId = quote.id)}>Ver detalle</button></td>
              </tr>
            {:else}
              <tr>
                <td class="empty" colspan="7">
                  {quotesStore.items.length ? 'No hay cotizaciones que coincidan.' : 'Aún no hay cotizaciones.'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pagination bind:page total={rows.length} size={PAGE_SIZE} />
    </section>
  {:else if quotesStore.status === 'error'}
    <div class="card error-box">
      <p>{quotesStore.error}</p>
      <button class="btn btn-outline" onclick={() => quotesStore.refresh()}>Reintentar</button>
    </div>
  {:else}
    <div class="stats-grid">
      {#each Array(3) as _, i (i)}<div class="skeleton" style:height="98px"></div>{/each}
    </div>
    <div class="skeleton" style:height="420px"></div>
  {/if}
</div>

<QuoteDrawer quote={detail} onclose={() => (detailId = null)} />
<QuoteFormModal open={formOpen} onclose={() => (formOpen = false)} oncreated={(q) => (detailId = q.id)} />

<style>
  .error-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }
</style>
