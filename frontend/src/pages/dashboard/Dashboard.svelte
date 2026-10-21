<script lang="ts">
  import { dashboard } from '../../lib/stores/dashboard.svelte'
  import { session } from '../../lib/stores/session.svelte'
  import type { Period } from '../../lib/types'
  import { delta, formatCompact, greeting, percent } from '../../lib/utils/format'
  import ActivityTable from './ActivityTable.svelte'
  import DeliveryRoutes from './DeliveryRoutes.svelte'
  import KpiCard from './KpiCard.svelte'
  import PortfolioOverview from './PortfolioOverview.svelte'

  const periodLabel: Record<Period, string> = { semana: 'Semana', mes: 'Mes', trimestre: 'Trimestre' }

  let firstName = $derived(session.current?.user.name.split(' ')[0] ?? '')
  let s = $derived(dashboard.current)
  let h = $derived(dashboard.highlights)
  let efectividad = $derived(percent(s.visitasRealizadas, s.visitasProgramadas))

  const money = (v: number) => `$${formatCompact(v)}`
  const pct = (v: number) => `${Math.round(v)}%`

  function trend(current: number, previous: number) {
    const d = delta(current, previous)
    return { trend: `${Math.abs(d)}%`, trendUp: d >= 0 }
  }
</script>

<div class="dashboard">
  <header class="intro">
    <p class="eyebrow">Resumen general</p>
    <h1>{greeting()}, {firstName}</h1>
    <p class="subtitle">Esto es lo que está pasando con tu operación comercial.</p>
  </header>

  <PortfolioOverview />

  <!-- Visitas, rutas, cotizaciones y pedidos aún no existen en el backend:
       esta sección usa el servidor simulado (lib/services/mock) con el mismo contrato. -->
  <div class="section-head">
    <div>
      <h2>Operación comercial</h2>
      <p><span class="pill demo">Demostración</span> Visitas, entregas y pedidos simulados hasta conectar esos módulos del backend.</p>
    </div>
  </div>

  <div class="period">
    <label for="period">Periodo</label>
    <select id="period" class="select" bind:value={dashboard.period}>
      {#each Object.entries(periodLabel) as [value, label] (value)}
        <option {value}>{label}</option>
      {/each}
    </select>
  </div>

  {#if dashboard.status === 'loading' || dashboard.status === 'idle'}
    <div class="kpis" aria-busy="true">
      {#each Array(6) as _, i (i)}<div class="skeleton kpi-skeleton"></div>{/each}
    </div>
    <div class="skeleton block-skeleton"></div>
  {:else if dashboard.status === 'error'}
    <div class="card error">
      <p>No pudimos cargar el dashboard.</p>
      <button class="btn btn-outline" onclick={() => dashboard.connect()}>Reintentar</button>
    </div>
  {:else}
    <div class="kpis">
      <KpiCard
        featured
        icon="check"
        label="Visitas realizadas"
        value={s.visitasRealizadas}
        detail="{s.visitasRealizadas} de {s.visitasProgramadas} · {efectividad}%"
        flash={h['kpi:visitasRealizadas']}
      />
      <KpiCard
        icon="calendar"
        label="Visitas programadas"
        value={s.visitasProgramadas}
        detail="{s.visitasProgramadas - s.visitasRealizadas} pendientes"
        flash={h['kpi:visitasProgramadas']}
      />
      <KpiCard
        icon="trending-up"
        label="Efectividad"
        value={efectividad}
        format={pct}
        detail="{s.visitasRealizadas} de {s.visitasProgramadas} visitas"
        flash={h['kpi:visitasRealizadas'] || h['kpi:visitasProgramadas']}
      />
      <KpiCard
        icon="file-text"
        label="Valor cotizado"
        value={s.valorCotizado}
        format={money}
        detail="vs. periodo anterior"
        {...trend(s.valorCotizado, s.valorCotizadoPrev)}
        flash={h['kpi:valorCotizado']}
      />
      <KpiCard
        icon="package"
        label="Pedidos cerrados"
        value={s.pedidosCerrados}
        detail="vs. periodo anterior"
        trend={String(Math.abs(s.pedidosCerrados - s.pedidosCerradosPrev))}
        trendUp={s.pedidosCerrados >= s.pedidosCerradosPrev}
        flash={h['kpi:pedidosCerrados']}
      />
      <KpiCard
        icon="briefcase"
        label="Facturación"
        value={s.facturacion}
        format={money}
        detail="vs. periodo anterior"
        {...trend(s.facturacion, s.facturacionPrev)}
        flash={h['kpi:facturacion']}
      />
    </div>

    <DeliveryRoutes />
    <ActivityTable />
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;
    gap: 28px;
    max-width: 1240px;
  }

  h1 {
    margin-top: 10px;
    font-size: clamp(1.7rem, 2.6vw, 2.1rem);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .section-head {
    margin-top: 8px;
    padding-top: 24px;
    border-top: 1px solid var(--border-default);
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
    font-size: 12px;
    color: var(--text-muted);
  }

  .pill.demo {
    padding: 2px 10px;
    font: 700 11px/18px var(--font-heading);
    color: #b45309;
    border-radius: 999px;
    background: #fffbeb;
  }

  .subtitle {
    margin-top: 6px;
    font-size: 0.92rem;
    color: var(--text-secondary);
  }

  .period {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-bottom: -12px;
    font-size: 0.85rem;
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

  .block-skeleton {
    height: 460px;
    border-radius: 18px;
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  @media (max-width: 1400px) {
    .kpis {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .period {
      margin-bottom: 0;
    }
  }
</style>
