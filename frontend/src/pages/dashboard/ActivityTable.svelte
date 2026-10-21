<script lang="ts">
  import { fade } from 'svelte/transition'
  import Icon from '../../lib/components/Icon.svelte'
  import { dashboard } from '../../lib/stores/dashboard.svelte'
  import type { VisitRow, VisitStatus } from '../../lib/types'
  import { downloadCsv } from '../../lib/utils/csv'
  import { formatDate, formatMoney } from '../../lib/utils/format'
  import VisitDetailModal from './VisitDetailModal.svelte'
  import { visitStatusLabel } from './visitLabels'

  type Range = 'hoy' | 'semana' | 'mes' | 'todo'

  const PAGE = 8

  let range = $state<Range>('semana')
  let statuses = $state<VisitStatus[]>([])
  let filtersOpen = $state(false)
  let showAll = $state(false)
  let detail = $state<VisitRow | null>(null)
  let filtersEl: HTMLDivElement

  function inRange(iso: string, r: Range): boolean {
    if (r === 'todo') return true
    const date = new Date(iso)
    const now = new Date()
    if (r === 'hoy') return date.toDateString() === now.toDateString()
    if (r === 'mes') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    const monday = new Date(now)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const nextMonday = new Date(monday)
    nextMonday.setDate(monday.getDate() + 7)
    return date >= monday && date < nextMonday
  }

  let rows = $derived.by(() => {
    const q = dashboard.query.trim().toLowerCase()
    return dashboard.visits.filter(
      (v) =>
        inRange(v.fecha, range) &&
        (statuses.length === 0 || statuses.includes(v.estado)) &&
        (!q || `${v.cliente} ${v.municipio} ${v.tipo}`.toLowerCase().includes(q)),
    )
  })

  let visibleRows = $derived(showAll ? rows : rows.slice(0, PAGE))

  function toggleStatus(status: VisitStatus) {
    statuses = statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
  }

  function exportCsv() {
    downloadCsv(
      `kestrel-visitas-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Fecha', 'Cliente', 'Municipio', 'Tipo', 'Potencial', 'Estado visita', 'Cotización', 'Resultado'],
      rows.map((v) => [
        formatDate(v.fecha),
        v.cliente,
        v.municipio,
        v.tipo,
        v.potencial,
        visitStatusLabel[v.estado],
        v.cotizacion,
        v.resultado,
      ]),
    )
  }

  function closeFiltersOnOutsideClick(event: MouseEvent) {
    if (filtersOpen && !filtersEl.contains(event.target as Node)) filtersOpen = false
  }
</script>

<svelte:window onclick={closeFiltersOnOutsideClick} />

<section class="card table-card">
  <header>
    <div>
      <h2>Seguimiento de rutas y visitas</h2>
      <p>Actividad comercial reciente</p>
    </div>

    <div class="controls">
      <select class="select" bind:value={range} aria-label="Rango de fechas">
        <option value="hoy">Hoy</option>
        <option value="semana">Esta semana</option>
        <option value="mes">Este mes</option>
        <option value="todo">Todo</option>
      </select>

      <div class="filters" bind:this={filtersEl}>
        <button class="btn btn-outline" aria-expanded={filtersOpen} onclick={() => (filtersOpen = !filtersOpen)}>
          <Icon name="filter" size={16} />
          Filtros
          {#if statuses.length}<span class="count">{statuses.length}</span>{/if}
        </button>

        {#if filtersOpen}
          <div class="popover" transition:fade={{ duration: 120 }}>
            <p class="popover-title">Estado de la visita</p>
            {#each Object.entries(visitStatusLabel) as [value, label] (value)}
              <label>
                <input
                  type="checkbox"
                  checked={statuses.includes(value as VisitStatus)}
                  onchange={() => toggleStatus(value as VisitStatus)}
                />
                {label}
              </label>
            {/each}
            {#if statuses.length}
              <button class="clear" onclick={() => (statuses = [])}>Limpiar filtros</button>
            {/if}
          </div>
        {/if}
      </div>

      <button class="btn btn-primary" onclick={exportCsv} disabled={rows.length === 0}>
        <Icon name="download" size={16} />
        Exportar
      </button>
    </div>
  </header>

  <div class="scroll">
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Municipio</th>
          <th>Tipo</th>
          <th>Potencial</th>
          <th>Estado visita</th>
          <th>Cotización</th>
          <th>Resultado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {#each visibleRows as visit (visit.id)}
          <tr class:flash={dashboard.highlights[visit.id]}>
            <td class="nowrap">{formatDate(visit.fecha)}</td>
            <td class="client">{visit.cliente}</td>
            <td>{visit.municipio}</td>
            <td>{visit.tipo}</td>
            <td>{visit.potencial}</td>
            <td><span class="badge {visit.estado}">{visitStatusLabel[visit.estado]}</span></td>
            <td class="num">{visit.cotizacion ? formatMoney(visit.cotizacion) : '—'}</td>
            <td>{visit.resultado ?? '—'}</td>
            <td><button class="link" onclick={() => (detail = visit)}>Ver detalle</button></td>
          </tr>
        {:else}
          <tr>
            <td class="empty" colspan="9">No hay visitas para los filtros seleccionados.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if rows.length > PAGE}
    <footer>
      <button class="link" onclick={() => (showAll = !showAll)}>
        {showAll ? 'Mostrar menos' : `Mostrar todas (${rows.length})`}
      </button>
    </footer>
  {/if}
</section>

<VisitDetailModal visit={detail} onclose={() => (detail = null)} />

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

  .filters {
    position: relative;
  }

  .count {
    display: grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 0.7rem;
    font-weight: 700;
    color: #fff;
    border-radius: 999px;
    background: var(--brand-600);
  }

  .popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 220px;
    padding: 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.25);
  }

  .popover-title {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .popover label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.88rem;
    cursor: pointer;
  }

  .popover input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--brand-600);
  }

  .clear {
    align-self: flex-start;
    padding: 0;
    font-size: 0.8rem;
    color: var(--brand-600);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 900px;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  th {
    padding: 12px 16px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
    color: var(--text-muted);
    background: #f8fafc;
    border-block: 1px solid var(--border-default);
  }

  td {
    padding: 14px 16px;
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

  .client {
    font-weight: 500;
  }

  .badge {
    display: inline-block;
    padding: 3px 10px;
    font-size: 0.72rem;
    font-weight: 600;
    white-space: nowrap;
    border-radius: 999px;
    color: var(--text-secondary);
    background: var(--bg-page);
  }

  .badge.visitado {
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .badge.pendiente {
    color: #b45309;
    background: #fffbeb;
  }

  .badge.reprogramado {
    color: #475569;
    background: #eef2f6;
  }

  .badge.sin_visitar {
    background: transparent;
  }

  .link {
    padding: 0;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
    color: var(--brand-600);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .link:hover {
    text-decoration: underline;
  }

  .empty {
    padding: 40px 16px;
    text-align: center;
    color: var(--text-muted);
  }

  footer {
    display: flex;
    justify-content: center;
    padding: 14px;
    border-top: 1px solid var(--border-default);
  }
</style>
