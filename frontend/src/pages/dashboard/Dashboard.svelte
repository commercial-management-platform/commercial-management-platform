<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import { addDays, weekRange } from '../../lib/domain/tracking'
  import { can } from '../../lib/permissions.svelte'
  import type { CommercialKpis } from '../../lib/services/dashboardApi'
  import { businessToday } from '../../lib/services/visitsApi'
  import { advisors } from '../../lib/stores/advisors.svelte'
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { useClientDirectory } from '../../lib/stores/clientDirectory.svelte'
  import { operation } from '../../lib/stores/operation.svelte'
  import { session } from '../../lib/stores/session.svelte'
  import { currentWeekLabel, delta, formatCompact, formatTime, greeting } from '../../lib/utils/format'
  import DayRoute from './DayRoute.svelte'
  import KpiCard from './KpiCard.svelte'
  import PortfolioOverview from './PortfolioOverview.svelte'
  import TrackingTable from './TrackingTable.svelte'

  // Dashboard comercial (HU-15). Los indicadores los calcula el backend
  // (GET /dashboard/kpis) con los filtros de semana, zona y asesor.

  operation.use()
  useClientDirectory()
  advisors.load()
  catalogs.load()

  let firstName = $derived(session.current?.user.name.split(' ')[0] ?? '')
  let isCurrentWeek = $derived(operation.range.from === weekRange(businessToday()).from)
  let weekLabel = $derived(currentWeekLabel(new Date(`${operation.range.from}T12:00:00`)))

  // Los montos llegan como texto decimal; para mostrarlos basta un número.
  const toKpis = (k: CommercialKpis) => ({
    scheduled: k.scheduledVisits,
    visited: k.completedVisits,
    effectiveness: k.effectiveness,
    quoted: Number(k.quotedValue),
    closedOrders: k.closedOrders,
    billed: Number(k.billedValue),
  })
  let s = $derived(operation.kpis ? toKpis(operation.kpis.current) : null)
  let prev = $derived(operation.kpis ? toKpis(operation.kpis.previous) : null)

  const money = (v: number) => `$${formatCompact(v)}`
  const pct = (v: number) => `${Math.round(v)}%`

  function trend(current: number, previous: number) {
    const d = delta(current, previous)
    return { trend: `${Math.abs(d)}%`, trendUp: d >= 0 }
  }

  const shiftWeek = (weeks: number) => (operation.week = addDays(operation.range.from, weeks * 7))
</script>

<div class="dashboard">
  <header class="intro">
    <p class="eyebrow">Resumen general</p>
    <h1>{greeting()}, {firstName}</h1>
    <p class="subtitle">Esto es lo que está pasando con tu operación comercial.</p>
  </header>

  <section class="operation" aria-labelledby="operation-title">
    <div class="section-head">
      <div>
        <h2 id="operation-title">Operación comercial</h2>
        <p>
          <span class="pill real">Datos reales</span>
          {#if operation.updatedAt}Actualizado a las {formatTime(operation.updatedAt)}{/if}
        </p>
      </div>

      <div class="filters">
        <div class="week-nav" role="group" aria-label="Semana">
          <button class="icon-btn" onclick={() => shiftWeek(-1)} aria-label="Semana anterior">
            <Icon name="chevron-left" size={16} />
          </button>
          <span class="week-label">{weekLabel}</span>
          <button class="icon-btn" onclick={() => shiftWeek(1)} aria-label="Semana siguiente">
            <Icon name="chevron-right" size={16} />
          </button>
          {#if !isCurrentWeek}
            <button class="today" onclick={() => (operation.week = businessToday())}>Esta semana</button>
          {/if}
        </div>

        <!-- El asesor solo ve sus indicadores (CA-03): no filtra por zona ni asesor. -->
        {#if can.isManager}
          <select class="select" bind:value={operation.zoneId} aria-label="Zona">
            <option value="">Todas las zonas</option>
            {#each catalogs.zones as zone (zone.id)}
              <option value={zone.id}>{zone.name}</option>
            {/each}
          </select>
          <select class="select" bind:value={operation.advisorId} aria-label="Asesor">
            <option value="">Todos los asesores</option>
            {#each advisors.list as advisor (advisor.id)}
              <option value={advisor.id}>{advisor.name}</option>
            {/each}
          </select>
        {/if}
      </div>
    </div>

  {#if operation.status === 'error'}
    <div class="card error">
      <p>{operation.error}</p>
      <button class="btn btn-outline" onclick={() => operation.reload()}>Reintentar</button>
    </div>
  {:else if !s || !prev}
    <div class="kpis" aria-busy="true">
      {#each Array(6) as _, i (i)}<div class="skeleton kpi-skeleton"></div>{/each}
    </div>
  {:else}
    {#if operation.error}
      <p class="stale"><Icon name="alert-circle" size={14} /> {operation.error} Se muestran los últimos datos.</p>
    {/if}
    <div class="kpis">
      <KpiCard
        featured
        icon="check"
        label="Visitas realizadas"
        value={s.visited}
        detail="Objetivo semanal: {s.visited} de {s.scheduled}"
      />
      <KpiCard
        icon="calendar"
        label="Visitas programadas"
        value={s.scheduled}
        detail="{s.scheduled - s.visited} pendientes"
      />
      <KpiCard
        icon="trending-up"
        label="Efectividad"
        value={s.effectiveness}
        format={pct}
        detail="{s.visited} de {s.scheduled} visitas"
        trend="{Math.abs(s.effectiveness - prev.effectiveness)} pts"
        trendUp={s.effectiveness >= prev.effectiveness}
      />
      <KpiCard
        icon="file-text"
        label="Valor cotizado"
        value={s.quoted}
        format={money}
        detail="vs. semana anterior"
        {...trend(s.quoted, prev.quoted)}
      />
      <KpiCard
        icon="package"
        label="Pedidos cerrados"
        value={s.closedOrders}
        detail="confirmados o entregados"
        trend={String(Math.abs(s.closedOrders - prev.closedOrders))}
        trendUp={s.closedOrders >= prev.closedOrders}
      />
      <KpiCard
        icon="briefcase"
        label="Facturación"
        value={s.billed}
        format={money}
        detail="vs. semana anterior"
        {...trend(s.billed, prev.billed)}
      />
    </div>
  {/if}
  </section>

  <PortfolioOverview />

  <DayRoute />

  <TrackingTable />
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    width: 100%;
    max-width: var(--content-max);
    margin-inline: auto;
  }

  .operation {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  h1 {
    margin-top: var(--space-1);
    font-size: clamp(1.7rem, 2.6vw, 2.1rem);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .section-head h2 {
    font-size: 18px;
    line-height: 26px;
  }

  .section-head p {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 4px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .pill.real {
    padding: 2px 10px;
    font: 700 12px/18px var(--font-heading);
    color: var(--brand-700);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .filters {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
  }

  .week-nav {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon-btn {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    padding: 0;
    color: var(--text-primary);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    cursor: pointer;
  }

  .week-label {
    min-width: 108px;
    font: 600 0.9rem var(--font-heading);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .today {
    padding: 0 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--brand-600);
    background: none;
    border: 0;
    cursor: pointer;
  }

  .stale {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: #b45309;
  }

  .subtitle {
    margin-top: 6px;
    font-size: 1rem;
    color: var(--text-secondary);
  }

  .kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 16px;
  }

  .skeleton {
    border-radius: 14px;
    background: linear-gradient(90deg, #e9eef3 0%, #f5f7fa 50%, #e9eef3 100%);
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }

  .kpi-skeleton {
    height: 156px;
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  /* 6 columnas en pantallas amplias, 3×2 en portátil (≈1366 px) y 2×3 en tablet */
  @media (max-width: 1400px) {
    .kpis {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .kpis {
      gap: 12px;
    }

    .section-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .filters {
      justify-content: flex-start;
      width: 100%;
    }

    .filters .select {
      flex: 1;
      min-width: 0;
    }
  }
</style>
