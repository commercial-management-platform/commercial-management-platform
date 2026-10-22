<script lang="ts">
  import FiltersMenu from '../../lib/components/FiltersMenu.svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import Pagination from '../../lib/components/Pagination.svelte'
  import StatCard from '../../lib/components/StatCard.svelte'
  import { quoteStatusLabel } from '../../lib/domain/commerce'
  import { useLiveClients } from '../../lib/stores/clients.svelte'
  import { ordersStore, quoteTotals, quotesStore } from '../../lib/stores/commerce.svelte'
  import { useLiveRoutes } from '../../lib/stores/routes.svelte'
  import type { QuoteStatus } from '../../lib/types'
  import { downloadCsv } from '../../lib/utils/csv'
  import { formatCompact, formatDate, formatMoney, formatShortDate } from '../../lib/utils/format'
  import QuoteDrawer from './QuoteDrawer.svelte'
  import QuoteFormModal from './QuoteFormModal.svelte'
  import { quoteBadge } from './badges'

  // Clientes (contacto, NIT) y asesores se usan en el detalle y el formulario.
  quotesStore.use()
  ordersStore.use()
  useLiveClients()
  useLiveRoutes()

  const PAGE_SIZE = 10
  const STATUSES = Object.keys(quoteStatusLabel) as QuoteStatus[]

  let query = $state('')
  let statuses = $state<QuoteStatus[]>([])
  let page = $state(0)
  let detailId = $state<string | null>(null)
  let formOpen = $state(false)

  let totals = $derived(quoteTotals())
  let detail = $derived(detailId ? (quotesStore.byId.get(detailId) ?? null) : null)

  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return quotesStore.items
      .filter(
        (quote) =>
          (statuses.length === 0 || statuses.includes(quote.estado)) &&
          (!q || `${quote.numero} ${quote.cliente}`.toLowerCase().includes(q)),
      )
      .toSorted((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
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
      ['Cotización', 'Cliente', 'Fecha', 'Vigencia (días)', 'Valor', 'Estado'],
      rows.map((q) => [q.numero, q.cliente, formatDate(q.fecha), q.vigenciaDias, q.valor, quoteStatusLabel[q.estado]]),
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
                {quoteStatusLabel[status]}
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
              <th>Fecha</th>
              <th>Vigencia</th>
              <th>Valor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each visible as quote (quote.id)}
              <tr class:flash={quotesStore.highlights[quote.id]}>
                <td class="strong">{quote.numero}</td>
                <td>{quote.cliente}</td>
                <td class="num">{formatShortDate(quote.fecha)}</td>
                <td>{quote.vigenciaDias} días</td>
                <td class="num">{formatMoney(quote.valor)}</td>
                <td><span class="badge {quoteBadge[quote.estado]}">{quoteStatusLabel[quote.estado]}</span></td>
                <td><button class="link-btn" onclick={() => (detailId = quote.id)}>Ver detalle</button></td>
              </tr>
            {:else}
              <tr><td class="empty" colspan="7">No hay cotizaciones que coincidan.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pagination bind:page total={rows.length} size={PAGE_SIZE} />
    </section>
  {:else if quotesStore.status === 'error'}
    <div class="card error-box">
      <p>No pudimos cargar las cotizaciones.</p>
      <button class="btn btn-outline" onclick={() => quotesStore.connect()}>Reintentar</button>
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
