<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import AnimatedNumber from '../../lib/components/AnimatedNumber.svelte'
  import Icon, { type IconName } from '../../lib/components/Icon.svelte'
  import { DIAS, ZONAS, routeStatusLabel, zonaLabel } from '../../lib/domain/routes'
  import { router } from '../../lib/router.svelte'
  import { routesStore, useLiveRoutes } from '../../lib/stores/routes.svelte'
  import type { AssignedRoute, RouteStatus, Zona } from '../../lib/types'
  import { percent } from '../../lib/utils/format'
  import RouteDetailModal from './RouteDetailModal.svelte'

  useLiveRoutes()

  const STATUS_ORDER: RouteStatus[] = ['en_curso', 'programada', 'completada']

  let query = $state('')
  let statuses = $state<RouteStatus[]>([])
  let zona = $state<Zona | ''>('')
  let filtersOpen = $state(false)
  let detail = $state<AssignedRoute | null>(null)
  let filtersEl = $state<HTMLDivElement>()

  // El filtro por asesor llega desde "Ver asignaciones" (?asesor=a1).
  let asesorId = $derived(router.params.asesor ?? '')
  let asesorName = $derived(routesStore.asesorById.get(asesorId)?.nombre)

  // Resalta la ruta recién creada (?nueva=<id>).
  onMount(() => {
    if (router.params.nueva) routesStore.flash(router.params.nueva)
  })

  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return routesStore.routes
      .filter((r) => {
        const asesor = routesStore.asesorById.get(r.asesorId)?.nombre ?? ''
        return (
          (!asesorId || r.asesorId === asesorId) &&
          (!zona || r.zona === zona) &&
          (statuses.length === 0 || statuses.includes(r.estado)) &&
          (!q || `${r.nombre} ${asesor} ${r.dia}`.toLowerCase().includes(q))
        )
      })
      .toSorted(
        (a, b) =>
          STATUS_ORDER.indexOf(a.estado) - STATUS_ORDER.indexOf(b.estado) ||
          DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) ||
          a.nombre.localeCompare(b.nombre),
      )
  })

  let activeFilters = $derived(statuses.length + (zona ? 1 : 0))

  const cards: { key: 'activas' | 'completadas' | 'visitasProgramadas'; label: string; icon: IconName }[] = [
    { key: 'activas', label: 'Rutas activas', icon: 'activity' },
    { key: 'completadas', label: 'Completadas', icon: 'check' },
    { key: 'visitasProgramadas', label: 'Visitas programadas', icon: 'calendar' },
  ]

  function toggleStatus(status: RouteStatus) {
    statuses = statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
  }

  function clearAsesor() {
    router.go('rutas/asignadas')
  }
</script>

<svelte:window onclick={(e) => filtersOpen && !filtersEl?.contains(e.target as Node) && (filtersOpen = false)} />

<div class="page">
  <header class="intro">
    <div>
      <p class="eyebrow">Planeación comercial</p>
      <h1>Rutas asignadas</h1>
      <p class="subtitle">Consulta las rutas activas, su responsable y el avance de cada recorrido.</p>
    </div>
    <button class="btn btn-primary" onclick={() => router.go('rutas/crear', { nueva: '1' })}>
      <Icon name="plus" size={16} strokeWidth={2.2} /> Nueva ruta
    </button>
  </header>

  {#if routesStore.status === 'ready'}
    <div class="stats">
      {#each cards as card (card.key)}
        <article class="card stat">
          <span class="stat-icon"><Icon name={card.icon} size={16} strokeWidth={2.2} /></span>
          <p>{card.label}</p>
          <strong><AnimatedNumber value={routesStore.totals[card.key]} /></strong>
        </article>
      {/each}
    </div>

    <section class="card list" aria-labelledby="routes-title">
      <header class="list-head">
        <div>
          <h2 id="routes-title">Listado de rutas</h2>
          <p>Planeación de la semana actual</p>
        </div>
        <div class="controls">
          <label class="search">
            <Icon name="search" size={16} />
            <input type="search" placeholder="Buscar ruta…" bind:value={query} />
          </label>
          <div class="filters" bind:this={filtersEl}>
            <button
              class="btn btn-outline"
              aria-expanded={filtersOpen}
              onclick={() => (filtersOpen = !filtersOpen)}
            >
              <Icon name="filter" size={16} /> Filtros
              {#if activeFilters}<span class="count">{activeFilters}</span>{/if}
            </button>
            {#if filtersOpen}
              <div class="popover" transition:fade={{ duration: 120 }}>
                <p class="popover-title">Estado</p>
                {#each STATUS_ORDER as status (status)}
                  <label class="check">
                    <input
                      type="checkbox"
                      checked={statuses.includes(status)}
                      onchange={() => toggleStatus(status)}
                    />
                    {routeStatusLabel[status]}
                  </label>
                {/each}
                <p class="popover-title">Territorio</p>
                <select class="select" bind:value={zona}>
                  <option value="">Todas las zonas</option>
                  {#each ZONAS as z (z.value)}<option value={z.value}>{z.label}</option>{/each}
                </select>
                {#if activeFilters}
                  <button
                    class="clear"
                    onclick={() => {
                      statuses = []
                      zona = ''
                    }}>Limpiar filtros</button
                  >
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </header>

      {#if asesorName}
        <div class="chips">
          <span class="chip">
            Asesor: {asesorName}
            <button onclick={clearAsesor} aria-label="Quitar filtro de asesor"><Icon name="x" size={12} /></button>
          </span>
        </div>
      {/if}

      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>Ruta</th>
              <th>Territorio</th>
              <th>Asesor</th>
              <th>Día</th>
              <th>Paradas</th>
              <th>Progreso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as route (route.id)}
              <tr class:flash={routesStore.highlights[route.id]}>
                <td class="name">{route.nombre}</td>
                <td>{zonaLabel(route.zona)}</td>
                <td>{routesStore.asesorById.get(route.asesorId)?.nombre ?? '—'}</td>
                <td>{route.dia}</td>
                <td class="num">{route.stops.length}</td>
                <td>
                  <span class="progress">
                    {route.completadas} de {route.stops.length}
                    <span class="mini-bar">
                      <span style:width="{percent(route.completadas, route.stops.length)}%"></span>
                    </span>
                  </span>
                </td>
                <td><span class="badge {route.estado}">{routeStatusLabel[route.estado]}</span></td>
                <td><button class="link" onclick={() => (detail = route)}>Ver ruta</button></td>
              </tr>
            {:else}
              <tr><td class="empty" colspan="8">No hay rutas para los filtros seleccionados.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {:else if routesStore.status === 'error'}
    <div class="card error">
      <p>No pudimos cargar las rutas.</p>
      <button class="btn btn-outline" onclick={() => routesStore.connect()}>Reintentar</button>
    </div>
  {:else}
    <div class="stats">
      {#each Array(3) as _, i (i)}<div class="skeleton" style:height="144px"></div>{/each}
    </div>
    <div class="skeleton" style:height="320px"></div>
  {/if}
</div>

<RouteDetailModal route={detail} onclose={() => (detail = null)} />

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1240px;
  }

  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  h1 {
    margin-top: 8px;
    font-size: 32px;
    line-height: 40px;
    letter-spacing: -0.02em;
  }

  .subtitle {
    margin-top: 6px;
    color: var(--text-secondary);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .stat {
    padding: 20px;
  }

  .stat-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    color: #fff;
    border-radius: 50%;
    background: var(--brand-700);
  }

  .stat p {
    margin-top: 22px;
    font-size: 13px;
    color: var(--text-primary);
  }

  .stat strong {
    display: block;
    margin-top: 4px;
    font: 800 30px/36px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  .list {
    overflow: visible;
  }

  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding: 20px;
  }

  h2 {
    font-size: 15px;
    line-height: 22px;
  }

  .list-head p {
    font-size: 12px;
    color: var(--text-muted);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 200px;
    height: 42px;
    padding: 0 12px;
    color: var(--text-muted);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .search:focus-within {
    border-color: var(--brand-500);
    box-shadow: var(--ring);
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
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
    font-size: 11px;
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
    font: 600 11px/16px var(--font-heading);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .check input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--brand-600);
  }

  .popover .select {
    width: 100%;
    height: 38px;
  }

  .clear {
    align-self: flex-start;
    padding: 0;
    font-size: 13px;
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .chips {
    padding: 0 20px 14px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 4px 12px;
    font: 600 12px/18px var(--font-heading);
    color: var(--text-brand);
    border: 1px solid var(--brand-100);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .chip button {
    display: grid;
    place-items: center;
    padding: 3px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .chip button:hover {
    background: var(--brand-100);
  }

  .scroll {
    overflow-x: auto;
    border-bottom-left-radius: 18px;
    border-bottom-right-radius: 18px;
  }

  table {
    width: 100%;
    min-width: 860px;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    padding: 12px 20px;
    font: 600 11px/16px var(--font-heading);
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--bg-surface-soft);
    border-block: 1px solid var(--border-default);
  }

  td {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border-default);
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:hover {
    background: var(--bg-surface-soft);
  }

  tr.flash {
    animation: live-flash 2.4s ease-out;
  }

  .name {
    font: 700 13px/18px var(--font-heading);
    white-space: nowrap;
  }

  .num {
    font-variant-numeric: tabular-nums;
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .mini-bar {
    width: 56px;
    height: 4px;
    border-radius: 999px;
    background: var(--neutral-100);
    overflow: hidden;
  }

  .mini-bar span {
    display: block;
    height: 100%;
    background: var(--brand-600);
    transition: width 0.6s ease;
  }

  .badge {
    display: inline-block;
    padding: 3px 10px;
    font: 700 11px/16px var(--font-heading);
    white-space: nowrap;
    border-radius: 999px;
    color: var(--neutral-700);
    background: var(--neutral-100);
  }

  .badge.completada {
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .badge.programada {
    color: var(--neutral-700);
    background: var(--neutral-100);
    border: 1px solid var(--border-default);
  }

  .link {
    padding: 0;
    font: 700 13px/18px var(--font-heading);
    white-space: nowrap;
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .link:hover {
    text-decoration: underline;
  }

  .empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .skeleton {
    border-radius: 18px;
    background: linear-gradient(90deg, var(--neutral-100) 0%, var(--neutral-50) 50%, var(--neutral-100) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  @media (max-width: 760px) {
    .intro {
      flex-direction: column;
      align-items: flex-start;
    }

    .stats {
      grid-template-columns: 1fr;
    }

    .controls,
    .search {
      width: 100%;
    }

    .search {
      flex: 1;
    }
  }
</style>
