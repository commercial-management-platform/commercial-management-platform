<script lang="ts">
  import { onMount } from 'svelte'
  import FiltersMenu from '../../lib/components/FiltersMenu.svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import Pagination from '../../lib/components/Pagination.svelte'
  import StatCard from '../../lib/components/StatCard.svelte'
  import { orderStatusLabel } from '../../lib/domain/commerce'
  import { router } from '../../lib/router.svelte'
  import { useLiveClients } from '../../lib/stores/clients.svelte'
  import { orderTotals, ordersStore, quotesStore } from '../../lib/stores/commerce.svelte'
  import type { OrderStatus } from '../../lib/types'
  import { downloadCsv } from '../../lib/utils/csv'
  import { formatCompact, formatDate, formatMoney, formatShortDate } from '../../lib/utils/format'
  import { orderBadge } from '../quotes/badges'
  import OrderDrawer from './OrderDrawer.svelte'
  import OrderFormModal from './OrderFormModal.svelte'

  ordersStore.use()
  quotesStore.use()
  useLiveClients()

  const PAGE_SIZE = 10
  const STATUSES = Object.keys(orderStatusLabel) as OrderStatus[]

  let query = $state('')
  let statuses = $state<OrderStatus[]>([])
  let page = $state(0)
  let detailId = $state<string | null>(null)
  let formOpen = $state(false)

  let totals = $derived(orderTotals())
  let detail = $derived(detailId ? (ordersStore.byId.get(detailId) ?? null) : null)

  // Pedido recién creado desde otra vista (?nuevo=<id>): se resalta y se abre.
  onMount(() => {
    const id = router.params.nuevo
    if (id) {
      ordersStore.flash(id)
      detailId = id
    }
  })

  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return ordersStore.items
      .filter(
        (order) =>
          (statuses.length === 0 || statuses.includes(order.estado)) &&
          (!q || `${order.numero} ${order.cliente}`.toLowerCase().includes(q)),
      )
      .toSorted((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
  })
  let visible = $derived(rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE))

  $effect(() => {
    void [query, statuses]
    page = 0
  })

  function toggle(status: OrderStatus) {
    statuses = statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
  }

  function exportCsv() {
    downloadCsv(
      `kestrel-pedidos-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Pedido', 'Cliente', 'Creación', 'Entrega', 'Valor', 'Estado', 'Cotización'],
      rows.map((o) => [
        o.numero,
        o.cliente,
        formatDate(o.fecha),
        formatDate(o.entrega),
        o.valor,
        orderStatusLabel[o.estado],
        o.quoteId ? (quotesStore.byId.get(o.quoteId)?.numero ?? '') : '',
      ]),
    )
  }
</script>

<div class="list-page">
  <header class="page-intro">
    <div>
      <p class="eyebrow">Operación comercial</p>
      <h1>Pedidos</h1>
      <p class="subtitle">Da seguimiento desde la confirmación hasta la entrega.</p>
    </div>
    <button class="btn btn-primary" onclick={() => (formOpen = true)}>
      <Icon name="plus" size={16} strokeWidth={2.2} /> Nuevo pedido
    </button>
  </header>

  {#if ordersStore.status === 'ready'}
    <div class="stats-grid">
      <StatCard label="Total" value={totals.total} flash={ordersStore.highlights.kpi} />
      <StatCard label="En proceso" value={totals.enProceso} flash={ordersStore.highlights.kpi} />
      <StatCard label="Este mes" value={totals.esteMes} format={(v) => `$${formatCompact(v)}`} flash={ordersStore.highlights.kpi} />
    </div>

    <section class="card">
      <div class="table-toolbar">
        <label class="search-field">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Buscar en pedidos…" bind:value={query} />
        </label>
        <div class="actions">
          <FiltersMenu count={statuses.length} onclear={() => (statuses = [])}>
            <p class="filter-title">Estado</p>
            {#each STATUSES as status (status)}
              <label class="filter-check">
                <input type="checkbox" checked={statuses.includes(status)} onchange={() => toggle(status)} />
                {orderStatusLabel[status]}
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
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Creación</th>
              <th>Entrega</th>
              <th>Valor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each visible as order (order.id)}
              <tr class:flash={ordersStore.highlights[order.id]}>
                <td class="strong">{order.numero}</td>
                <td>{order.cliente}</td>
                <td class="num">{formatShortDate(order.fecha)}</td>
                <td class="num">{formatShortDate(order.entrega)}</td>
                <td class="num">{formatMoney(order.valor)}</td>
                <td><span class="badge {orderBadge[order.estado]}">{orderStatusLabel[order.estado]}</span></td>
                <td><button class="link-btn" onclick={() => (detailId = order.id)}>Ver detalle</button></td>
              </tr>
            {:else}
              <tr><td class="empty" colspan="7">No hay pedidos que coincidan.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pagination bind:page total={rows.length} size={PAGE_SIZE} />
    </section>
  {:else if ordersStore.status === 'error'}
    <div class="card error-box">
      <p>No pudimos cargar los pedidos.</p>
      <button class="btn btn-outline" onclick={() => ordersStore.connect()}>Reintentar</button>
    </div>
  {:else}
    <div class="stats-grid">
      {#each Array(3) as _, i (i)}<div class="skeleton" style:height="98px"></div>{/each}
    </div>
    <div class="skeleton" style:height="420px"></div>
  {/if}
</div>

<OrderDrawer order={detail} onclose={() => (detailId = null)} />
<OrderFormModal open={formOpen} onclose={() => (formOpen = false)} oncreated={(o) => (detailId = o.id)} />

<style>
  .error-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }
</style>
