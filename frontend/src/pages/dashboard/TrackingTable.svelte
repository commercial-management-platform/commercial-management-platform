<script lang="ts">
  import { untrack } from 'svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import Pagination from '../../lib/components/Pagination.svelte'
  import { weekdayName } from '../../lib/domain/tracking'
  import { exportTracking, listTracking, type TrackingFilters, type TrackingRow } from '../../lib/services/dashboardApi'
  import { VISIT_STATUS_LABELS, businessToday, type VisitStatus } from '../../lib/services/visitsApi'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'
  import { dashboard } from '../../lib/stores/dashboard.svelte'
  import { operation } from '../../lib/stores/operation.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatDate, formatMoney, formatTime } from '../../lib/utils/format'

  // Tabla de seguimiento de rutas y visitas (HU-15 CA-06), paginada en el backend,
  // y su exportación CSV (HU-17) con los mismos filtros.

  const PAGE_SIZE = 10
  const SEARCH_DELAY_MS = 350
  const STATUSES = Object.keys(VISIT_STATUS_LABELS) as VisitStatus[]

  let status = $state<VisitStatus | ''>('')
  let search = $state('')
  /** 0-based, como Pagination. */
  let page = $state(0)

  let load = $state<'loading' | 'ready' | 'error'>('loading')
  let error = $state('')
  let rows = $state<TrackingRow[]>([])
  let total = $state(0)
  let exporting = $state(false)

  // La búsqueda de la barra superior se aplica al dejar de escribir.
  $effect(() => {
    const q = dashboard.query.trim()
    const timer = setTimeout(() => (search = q), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  })

  let filters = $derived<TrackingFilters>({
    week: operation.week,
    zoneId: operation.zoneId === '' ? undefined : operation.zoneId,
    advisorId: operation.advisorId === '' ? undefined : operation.advisorId,
    status: status || undefined,
    search: search || undefined,
  })

  // Al cambiar un filtro se vuelve a la primera página.
  $effect(() => {
    void filters
    page = 0
  })

  let request = 0
  async function fetchPage() {
    const current = ++request
    if (!rows.length) load = 'loading'
    try {
      const result = await listTracking({ ...filters, page: page + 1, limit: PAGE_SIZE })
      if (current !== request) return
      rows = result.data
      total = result.total
      load = 'ready'
      error = ''
    } catch (e) {
      if (current !== request) return
      error = errorText(e, 'No pudimos cargar el seguimiento de visitas.')
      if (load !== 'ready') load = 'error'
    }
  }

  // Se recarga con los filtros, la página y cada actualización "En vivo" del dashboard.
  $effect(() => {
    void [filters, page, operation.updatedAt]
    untrack(fetchPage)
  })

  // HU-17: el backend genera el CSV con las mismas columnas y filtros.
  async function exportCsv() {
    exporting = true
    try {
      const blob = await exportTracking(filters)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `seguimiento-visitas-${businessToday()}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo exportar', message: errorText(e, 'Intenta de nuevo.') })
    } finally {
      exporting = false
    }
  }

  const shortDate = (day: string) => formatDate(`${day}T12:00:00`)
  const money = (value: string | null) => (value === null ? '—' : formatMoney(Number(value)))
  const dash = (value: string | null) => value ?? '—'
</script>

<section class="card table-card">
  <header>
    <div>
      <h2>Seguimiento de rutas y visitas</h2>
      <p>Visitas de la semana con su cotización, pedido y próximo seguimiento</p>
    </div>

    <div class="controls">
      <select class="select" bind:value={status} aria-label="Estado de la visita">
        <option value="">Todos los estados</option>
        {#each STATUSES as value (value)}
          <option {value}>{VISIT_STATUS_LABELS[value]}</option>
        {/each}
      </select>

      <button class="btn btn-primary export" onclick={exportCsv} disabled={total === 0 || exporting} aria-label="Exportar a CSV">
        <Icon name={exporting ? 'loader' : 'download'} size={16} />
        <span>{exporting ? 'Exportando…' : 'Exportar'}</span>
      </button>
    </div>
  </header>

  {#if search}
    <p class="searching">Filtrando por “{search}”</p>
  {/if}

  {#if load === 'error'}
    <div class="empty">
      <p>{error}</p>
      <button class="btn btn-outline" onclick={fetchPage}>Reintentar</button>
    </div>
  {:else if load === 'loading'}
    <div class="loading">
      {#each Array(4) as _, i (i)}<div class="skeleton line"></div>{/each}
    </div>
  {:else}
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Asesor</th>
            <th>Territorio</th>
            <th>Sem.</th>
            <th>Día</th>
            <th>Ruta</th>
            <th>Cliente</th>
            <th>Municipio</th>
            <th>Tipo</th>
            <th>Potencial</th>
            <th>Estado visita</th>
            <th>Resultado</th>
            <th>Cotización</th>
            <th class="right">Valor</th>
            <th>Pedido</th>
            <th>Próx. seguimiento</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as r (r.visitId)}
            <tr class:flash={operation.highlights[r.visitId]}>
              <td class="nowrap">{shortDate(r.date)} <span class="muted">{formatTime(r.scheduledDate)}</span></td>
              <td class="nowrap">{r.advisorName}</td>
              <td>{dash(r.zone)}</td>
              <td class="num">{r.isoWeek}</td>
              <td class="capitalize">{weekdayName(r.scheduledDate)}</td>
              <td>{dash(r.routeName)}</td>
              <td class="client">{r.clientName}</td>
              <td>{dash(r.municipality)}</td>
              <td>{dash(r.clientType)}</td>
              <td>{dash(r.clientPotential)}</td>
              <td><span class="badge {r.status}">{VISIT_STATUS_LABELS[r.status]}</span></td>
              <td class="nowrap">{dash(r.result)}</td>
              <td class="nowrap">{dash(r.quoteNumbers)}</td>
              <td class="num right">{money(r.quoteValue)}</td>
              <td class="nowrap">{dash(r.orderNumbers)}</td>
              <td class="nowrap">{r.nextFollowUp ? shortDate(r.nextFollowUp) : '—'}</td>
            </tr>
          {:else}
            <tr>
              <td class="empty" colspan="16">No hay visitas para los filtros seleccionados.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- En pantallas pequeñas la tabla se reemplaza por tarjetas compactas. -->
    <ul class="cards">
      {#each rows as r (r.visitId)}
        <li class:flash={operation.highlights[r.visitId]}>
          <div class="card-head">
            <div>
              <p class="client">{r.clientName}</p>
              <p class="meta">{dash(r.municipality)} · {r.advisorName}</p>
            </div>
            <span class="badge {r.status}">{VISIT_STATUS_LABELS[r.status]}</span>
          </div>
          <dl>
            <div><dt>Fecha</dt><dd>{shortDate(r.date)} · {formatTime(r.scheduledDate)}</dd></div>
            <div><dt>Ruta</dt><dd>{dash(r.routeName)}</dd></div>
            <div><dt>Resultado</dt><dd>{dash(r.result)}</dd></div>
            <div><dt>Cotización</dt><dd class="num">{money(r.quoteValue)}</dd></div>
            <div><dt>Pedido</dt><dd>{dash(r.orderNumbers)}</dd></div>
            <div><dt>Próx. seguimiento</dt><dd>{r.nextFollowUp ? shortDate(r.nextFollowUp) : '—'}</dd></div>
          </dl>
        </li>
      {:else}
        <li class="empty">No hay visitas para los filtros seleccionados.</li>
      {/each}
    </ul>

    <Pagination bind:page {total} size={PAGE_SIZE} />
  {/if}
</section>

<style>
  .table-card {
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding: 22px 20px;
  }

  h2 {
    font-size: 1rem;
    font-weight: 700;
  }

  header p {
    margin-top: 2px;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .searching {
    padding: 0 20px 12px;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .loading {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 20px 20px;
  }

  .line {
    height: 44px;
    border-radius: 10px;
  }

  .scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 1500px;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  th {
    padding: 12px 14px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--text-muted);
    background: #f8fafc;
    border-block: 1px solid var(--border-default);
  }

  td {
    padding: 13px 14px;
    border-bottom: 1px solid var(--border-default);
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:hover {
    background: #fafbfc;
  }

  tr.flash {
    animation: live-flash 2.4s ease-out;
  }

  .nowrap,
  .num {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .right {
    text-align: right;
  }

  .muted {
    color: var(--text-muted);
  }

  .capitalize {
    text-transform: capitalize;
  }

  .client {
    font-weight: 500;
  }

  .badge {
    display: inline-block;
    padding: 3px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    border-radius: 999px;
    color: var(--text-secondary);
    background: var(--bg-page);
  }

  .badge.visited {
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .badge.scheduled {
    color: #b45309;
    background: #fffbeb;
  }

  .badge.cancelled {
    color: #475569;
    background: #eef2f6;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 16px;
    text-align: center;
    color: var(--text-muted);
  }

  td.empty {
    display: table-cell;
  }

  .cards {
    display: none;
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--border-default);
  }

  .cards li {
    padding: 16px;
    border-bottom: 1px solid var(--border-default);
  }

  .cards li:last-child {
    border-bottom: 0;
  }

  .cards li.flash {
    animation: live-flash 2.4s ease-out;
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .card-head .client {
    font-size: 0.95rem;
    font-weight: 700;
  }

  .meta {
    margin-top: 2px;
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    margin: 12px 0 0;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--bg-page);
  }

  dt {
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  dd {
    margin: 2px 0 0;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .cards .empty {
    padding: 32px 16px;
  }

  @media (max-width: 760px) {
    header {
      padding: 18px 16px;
    }

    .controls {
      width: 100%;
    }

    .controls .select {
      flex: 1;
      min-width: 0;
    }

    .scroll {
      display: none;
    }

    .cards {
      display: block;
    }
  }

  /* El botón de exportar queda solo con el icono para que los controles quepan en una fila. */
  @media (max-width: 420px) {
    .export span {
      display: none;
    }

    .export {
      width: 44px;
      padding: 0;
    }
  }
</style>
