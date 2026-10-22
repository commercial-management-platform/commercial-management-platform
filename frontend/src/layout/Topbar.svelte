<script lang="ts">
  import Icon from '../lib/components/Icon.svelte'
  import { router, type Route } from '../lib/router.svelte'
  import { dashboard } from '../lib/stores/dashboard.svelte'
  import { currentWeekLabel } from '../lib/utils/format'

  interface Props {
    onmenu: () => void
    onregister: () => void
  }

  let { onmenu, onregister }: Props = $props()

  const titles: Record<Route, string> = {
    dashboard: 'Resumen comercial',
    'rutas/crear': 'Creación de rutas',
    'rutas/asignadas': 'Rutas asignadas',
    'rutas/asesores': 'Asesor asignado',
    clientes: 'Gestión de clientes',
    visitas: 'Registrar visita',
    cotizaciones: 'Cotizaciones',
    pedidos: 'Pedidos',
  }

  const week = currentWeekLabel()
</script>

<header class="topbar">
  <button class="menu" onclick={onmenu} aria-label="Abrir menú">
    <Icon name="menu" size={22} />
  </button>

  <p class="crumbs">
    <span>Kestrel</span> / <strong>{titles[router.route]}</strong>
  </p>

  <div class="actions">
    <button
      class="live"
      class:paused={!dashboard.live}
      onclick={() => dashboard.toggleLive()}
      title={dashboard.live ? 'Datos en tiempo real. Clic para pausar las actualizaciones' : 'Actualizaciones pausadas. Clic para reanudarlas'}
      aria-pressed={!dashboard.live}
    >
      <span class="dot"></span>
      {dashboard.live ? 'En vivo' : 'Actualización pausada'}
      <Icon name={dashboard.live ? 'pause' : 'play'} size={12} />
    </button>

    <label class="search">
      <Icon name="search" size={18} />
      <input type="search" placeholder="Buscar cliente…" bind:value={dashboard.query} />
    </label>

    <div class="week" title="Semana en curso">
      <span>Semana</span>
      <strong>{week}</strong>
    </div>

    <button class="btn btn-primary register" onclick={onregister}>
      <Icon name="plus" size={18} strokeWidth={2.2} />
      <span>Registrar visita</span>
    </button>
  </div>
</header>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 16px;
    height: 80px;
    padding: 0 32px;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border-default);
  }

  .menu {
    display: none;
    place-items: center;
    padding: 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  }

  .crumbs {
    font-size: 0.82rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .crumbs span {
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .crumbs strong {
    font-weight: 500;
    color: var(--text-primary);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }

  .live {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 12px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--brand-700);
    border: 1px solid var(--brand-100);
    border-radius: 999px;
    background: var(--brand-50);
    cursor: pointer;
  }

  .live :global(svg) {
    opacity: 0.6;
  }

  .live .dot {
    position: relative;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--brand-500);
  }

  .live .dot::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--brand-500);
    animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  @keyframes ping {
    75%,
    100% {
      transform: scale(2.6);
      opacity: 0;
    }
  }

  .live.paused {
    color: var(--text-secondary);
    border-color: var(--border-default);
    background: var(--bg-page);
  }

  .live.paused .dot {
    background: var(--text-muted);
  }

  .live.paused .dot::after {
    display: none;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 240px;
    height: 44px;
    padding: 0 14px;
    color: var(--text-muted);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
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
    font-size: 0.9rem;
  }

  .week {
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 44px;
    padding: 0 12px;
    line-height: 1.2;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
  }

  .week span {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .week strong {
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .register {
    height: 44px;
  }

  @media (max-width: 1280px) {
    .week {
      display: none;
    }

    .search {
      width: 200px;
    }
  }

  @media (max-width: 1024px) {
    .topbar {
      padding: 0 16px;
      gap: 8px;
    }

    .menu {
      display: grid;
    }
  }

  @media (max-width: 760px) {
    .topbar {
      height: 64px;
    }

    .crumbs,
    .search {
      display: none;
    }

    .register span {
      display: none;
    }

    .register {
      width: 44px;
      padding: 0;
    }
  }
</style>
