<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import { dashboard } from '../../lib/stores/dashboard.svelte'
  import { portfolio, useLivePortfolio } from '../../lib/stores/portfolio.svelte'
  import { can } from '../../lib/permissions.svelte'
  import { formatTime, percent } from '../../lib/utils/format'
  import ClientsMap from './ClientsMap.svelte'
  import KpiCard from './KpiCard.svelte'

  useLivePortfolio()

  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date())
  const ago = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

  let t = $derived(portfolio.totals)
  let maxMunicipality = $derived(portfolio.byMunicipality[0]?.[1] ?? 1)

  function since(iso: string) {
    const days = Math.round((Date.now() - Date.parse(iso)) / 86_400_000)
    return days < 1 ? 'hoy' : ago.format(-days, 'day')
  }
</script>

<section class="portfolio" aria-labelledby="portfolio-title">
  <header class="section-head">
    <div>
      <h2 id="portfolio-title">Cartera de clientes</h2>
      <p>
        <span class="pill real"><span class="dot" class:live={dashboard.live}></span>Datos reales</span>
        {#if portfolio.updatedAt}
          Actualizado a las {formatTime(portfolio.updatedAt)}{dashboard.live ? ' · se refresca cada 30 s' : ''}
        {/if}
      </p>
    </div>
    <button
      class="btn btn-outline refresh"
      onclick={() => portfolio.refresh()}
      disabled={portfolio.status === 'loading'}
      aria-label="Actualizar cartera"
    >
      <Icon name="rotate-ccw" size={16} /> Actualizar
    </button>
  </header>

  {#if portfolio.status === 'error'}
    <div class="card notice">
      <Icon name="alert-circle" size={18} />
      <p>{portfolio.error}</p>
      <button class="btn btn-outline" onclick={() => portfolio.refresh()}>Reintentar</button>
    </div>
  {:else if portfolio.status !== 'ready'}
    <div class="kpis">
      {#each Array(4) as _, i (i)}<div class="skeleton" style:height="156px"></div>{/each}
    </div>
  {:else if t.total === 0}
    <div class="card empty">
      <span class="empty-icon"><Icon name="users" size={22} /></span>
      <div class="empty-text">
        {#if can.isAdvisor}
          <strong>Aún no tienes clientes asignados</strong>
          <p>Aparecerán aquí cuando te asignen rutas con clientes.</p>
        {:else}
          <strong>Todavía no hay clientes registrados</strong>
          <p>Ejecuta <code>npm run seed</code> en el backend para cargar datos de ejemplo.</p>
        {/if}
      </div>
      <a class="btn btn-soft" href={can.isAdvisor ? '#/rutas/asignadas' : '#/clientes'}>
        {can.isAdvisor ? 'Ver rutas' : 'Ir a clientes'}
      </a>
    </div>
  {:else}
    {#if portfolio.error}
      <p class="stale"><Icon name="alert-circle" size={14} /> {portfolio.error} Se muestran los últimos datos.</p>
    {/if}

    <div class="kpis" class:five={portfolio.advisors !== null}>
      <KpiCard featured icon="users" label="Clientes" value={t.total} detail="{t.inactive} inactivos" />
      <KpiCard icon="check" label="Activos" value={t.active} detail="{percent(t.active, t.total)}% de la cartera" />
      <KpiCard icon="plus" label="Nuevos este mes" value={t.newThisMonth} detail="registrados en {monthName}" />
      <KpiCard icon="map-pin" label="Con ubicación" value={t.located} detail="{t.total - t.located} sin coordenadas" />
      {#if portfolio.advisors !== null}
        <KpiCard icon="user-check" label="Asesores" value={portfolio.advisors} detail="activos en el equipo" />
      {/if}
    </div>

    <div class="grid">
      <div class="card map-card">
        <div class="card-head">
          <span class="head-icon"><Icon name="map-pin" size={18} /></span>
          <div>
            <h3>Mapa de clientes</h3>
            <p>{t.located} clientes ubicados · verde activos, gris inactivos</p>
          </div>
        </div>
        <div class="map-wrap">
          <ClientsMap clients={portfolio.clients} />
        </div>
      </div>

      <div class="side">
        <div class="card list-card">
          <h3>Clientes recientes</h3>
          <ol>
            {#each portfolio.recent as client (client.id)}
              <li class:flash={portfolio.highlights[String(client.id)]}>
                <span class="avatar">{clientDisplayName(client).charAt(0)}</span>
                <span class="info">
                  <strong>{clientDisplayName(client)}</strong>
                  <small>{client.municipality ?? '—'} · NIT {client.nit}</small>
                </span>
                <span class="when">{since(client.createdAt)}</span>
              </li>
            {/each}
          </ol>
        </div>

        <div class="card list-card">
          <h3>Por municipio</h3>
          <ul class="bars">
            {#each portfolio.byMunicipality as [name, count] (name)}
              <li>
                <span class="bar-label">{name}</span>
                <span class="bar"><span style:width="{(count / maxMunicipality) * 100}%"></span></span>
                <span class="bar-value">{count}</span>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .portfolio {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border-default);
  }

  .section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  h2 {
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

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 10px;
    font: 700 12px/18px var(--font-heading);
    border-radius: 999px;
  }

  .pill.real {
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted);
  }

  .dot.live {
    background: var(--brand-500);
    animation: blink 1.6s ease-in-out infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0.35;
    }
  }

  .refresh {
    height: 38px;
  }

  .kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .kpis.five {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .notice {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 20px;
    color: var(--text-secondary);
  }

  .notice p {
    flex: 1;
  }

  .empty {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
  }

  .empty-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    color: var(--brand-600);
    background: var(--brand-50);
  }

  .empty-text {
    flex: 1;
    min-width: 0;
  }

  .empty-text strong {
    font: 700 15px/22px var(--font-heading);
  }

  .empty-text p {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .stale {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #92400e;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 16px;
  }

  .map-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 20px;
  }

  .head-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    color: var(--brand-600);
    background: var(--brand-50);
  }

  h3 {
    font-size: 15px;
    line-height: 22px;
  }

  .card-head p {
    font-size: 13px;
    color: var(--text-muted);
  }

  .map-wrap {
    position: relative;
    flex: 1;
    min-height: 380px;
    border-top: 1px solid var(--border-default);
    /* Contiene los z-index de Leaflet para que no tapen la barra superior */
    isolation: isolate;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .list-card {
    padding: 18px 20px;
  }

  .list-card ol,
  .bars {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
  }

  .list-card li {
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 8px;
  }

  li.flash {
    animation: live-flash 2.4s ease-out;
  }

  .avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    font: 700 12px var(--font-heading);
    color: var(--brand-700);
    border-radius: 8px;
    background: var(--brand-50);
  }

  .info {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    line-height: 1.3;
  }

  .info strong {
    font: 700 13px/18px var(--font-heading);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    font-size: 12px;
    color: var(--text-muted);
  }

  .when {
    font-size: 12px;
    white-space: nowrap;
    color: var(--text-muted);
  }

  .bars li {
    display: grid;
    grid-template-columns: 110px 1fr 24px;
    align-items: center;
    gap: 10px;
    font-size: 12px;
  }

  .bar-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-secondary);
  }

  .bar {
    height: 8px;
    border-radius: 999px;
    background: var(--neutral-100);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--brand-600);
    transition: width 0.6s ease;
  }

  .bar-value {
    font: 700 12px var(--font-heading);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 1400px) {
    .kpis.five {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .kpis.five {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1100px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .section-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .kpis,
    .kpis.five {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
  }
</style>
