<script lang="ts">
  import { flip } from 'svelte/animate'
  import Icon from '../../lib/components/Icon.svelte'
  import { ZONAS } from '../../lib/domain/routes'
  import { routesStore, useLiveRoutes } from '../../lib/stores/routes.svelte'
  import type { Zona } from '../../lib/types'
  import AdvisorCard from './AdvisorCard.svelte'

  useLiveRoutes()

  let query = $state('')
  let zona = $state<Zona | ''>('')

  let cards = $derived(
    routesStore.stats.filter(
      (s) =>
        (!zona || s.asesor.zona === zona) &&
        (!query.trim() || s.asesor.nombre.toLowerCase().includes(query.trim().toLowerCase())),
    ),
  )
</script>

<div class="page">
  <header>
    <p class="eyebrow">Planeación comercial</p>
    <h1>Asesor asignado</h1>
    <p class="subtitle">Revisa la carga de trabajo, zonas y cumplimiento de cada asesor comercial.</p>
  </header>

  <div class="card toolbar">
    <label class="search">
      <Icon name="search" size={16} />
      <input type="search" placeholder="Buscar asesor…" bind:value={query} />
    </label>
    <select class="select" bind:value={zona} aria-label="Zona">
      <option value="">Todas las zonas</option>
      {#each ZONAS as z (z.value)}<option value={z.value}>{z.label}</option>{/each}
    </select>
  </div>

  {#if routesStore.status === 'ready'}
    <div class="grid">
      {#each cards as stats (stats.asesor.id)}
        <div animate:flip={{ duration: 250 }}>
          <AdvisorCard {stats} flash={routesStore.highlights[`asesor:${stats.asesor.id}`]} />
        </div>
      {:else}
        <p class="empty">No hay asesores que coincidan con la búsqueda.</p>
      {/each}
    </div>
  {:else if routesStore.status === 'error'}
    <div class="card error">
      <p>No pudimos cargar los asesores.</p>
      <button class="btn btn-outline" onclick={() => routesStore.connect()}>Reintentar</button>
    </div>
  {:else}
    <div class="grid">
      {#each Array(4) as _, i (i)}<div class="skeleton"></div>{/each}
    </div>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1240px;
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

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(280px, 100%);
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

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  .empty {
    grid-column: 1 / -1;
    padding: 40px 0;
    text-align: center;
    color: var(--text-muted);
  }

  .skeleton {
    height: 270px;
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

  @media (max-width: 560px) {
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }

    .search {
      width: 100%;
    }
  }
</style>
