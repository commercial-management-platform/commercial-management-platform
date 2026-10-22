<script lang="ts">
  import { flip } from 'svelte/animate'
  import { fade, fly } from 'svelte/transition'
  import Icon from '../../lib/components/Icon.svelte'
  import { planner } from '../../lib/stores/routePlanner.svelte'
  import { formatKm, fromMinutes } from '../../lib/utils/format'
  import PlanMap from './PlanMap.svelte'

  let selected = $derived(planner.selected)
</script>

<section class="card design" id="route-design" aria-labelledby="route-design-title">
  <header>
    <span class="head-icon"><Icon name="truck" size={20} /></span>
    <div>
      <h2 id="route-design-title">Diseño de la ruta</h2>
      <p>Vista previa del recorrido desde la bodega</p>
    </div>
    <span class="badge">
      <span class="dot" class:busy={planner.routing}></span>
      {planner.routing ? 'Calculando ruta…' : `${planner.stops.length} paradas`}
    </span>
  </header>

  <div class="body">
    <ol class="list">
      {#each planner.schedule as stop, i (stop.clientId)}
        <li animate:flip={{ duration: 300 }} in:fly={{ y: 12, duration: 250 }} out:fade={{ duration: 150 }}>
          <button
            class="stop"
            class:selected={selected?.clientId === stop.clientId}
            onclick={() => planner.select(stop.clientId)}
          >
            <span class="num">{i + 1}</span>
            <span class="info">
              <span class="row">
                <strong>{stop.client.nombre}</strong>
                <time>{fromMinutes(stop.llegada)}</time>
              </span>
              <span class="meta">{stop.client.direccion}</span>
              <span class="leg">
                {formatKm(stop.leg.distance)} desde {i === 0 ? 'la bodega' : 'la parada anterior'}
              </span>
            </span>
          </button>
        </li>
      {:else}
        <li class="empty">
          <Icon name="map-pin" size={22} />
          <p>Agrega clientes desde el buscador para trazar la ruta.</p>
        </li>
      {/each}
    </ol>

    <div class="map-wrap">
      <PlanMap />

      {#if selected}
        {#key selected.clientId}
          <div class="overlay destination" in:fade={{ duration: 180 }}>
            <p class="overline">Destino seleccionado</p>
            <strong>{selected.client.nombre}</strong>
            <p class="address"><Icon name="map-pin" size={14} /> {selected.client.direccion}</p>
          </div>
        {/key}

        <div class="overlay eta">
          <span class="eta-icon"><Icon name="truck" size={18} /></span>
          <div>
            <p class="overline">Llegada estimada</p>
            <strong>{fromMinutes(selected.llegada)} hrs</strong>
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .design {
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 22px 24px 18px;
  }

  .head-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 10px;
    color: var(--brand-600);
    background: var(--brand-50);
  }

  h2 {
    font-size: 18px;
    line-height: 36px;
  }

  header p {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    padding: 5px 12px;
    font: 700 13px/18px var(--font-heading);
    white-space: nowrap;
    color: var(--text-brand);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--brand-500);
  }

  .dot.busy {
    animation: blink 0.8s ease-in-out infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0.3;
    }
  }

  .body {
    display: grid;
    grid-template-columns: 300px 1fr;
    min-height: 390px;
    border-top: 1px solid var(--border-default);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 12px;
    list-style: none;
    max-height: 420px;
    overflow-y: auto;
  }

  .stop {
    display: flex;
    gap: 12px;
    width: 100%;
    padding: 16px 14px;
    text-align: left;
    border: 0;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s;
  }

  .stop:hover {
    background: var(--bg-surface-soft);
  }

  .stop.selected {
    background: var(--brand-50);
  }

  .num {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    font: 700 14px var(--font-heading);
    color: var(--text-secondary);
    border-radius: 50%;
    background: var(--neutral-100);
  }

  .selected .num {
    color: #fff;
    background: var(--brand-700);
  }

  .info {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .row strong {
    font: 700 15px/20px var(--font-heading);
  }

  time {
    font-size: 13px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .meta {
    font-size: 13px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .leg {
    margin-top: 4px;
    font: 600 13px/18px var(--font-heading);
    color: var(--text-secondary);
  }

  .selected .leg {
    color: var(--brand-600);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 40px 16px;
    text-align: center;
    font-size: 14px;
    color: var(--text-muted);
  }

  .map-wrap {
    position: relative;
    /* Contiene los z-index de Leaflet para que no tapen la barra superior */
    isolation: isolate;
    min-height: 390px;
    border-left: 1px solid var(--border-default);
  }

  .overlay {
    position: absolute;
    z-index: 500;
    padding: 12px 14px;
    background: var(--bg-surface);
    border-radius: 12px;
    box-shadow: 0 10px 24px -10px rgba(15, 23, 42, 0.3);
    pointer-events: none;
  }

  .overline {
    font: 600 12px/14px var(--font-heading);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .destination {
    top: 16px;
    left: 16px;
    max-width: 240px;
  }

  .destination strong {
    display: block;
    margin-top: 4px;
    font: 700 15px/20px var(--font-heading);
  }

  .address {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .address :global(svg) {
    flex-shrink: 0;
    color: var(--brand-600);
  }

  .eta {
    right: 16px;
    bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding-right: 20px;
  }

  .eta-icon {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    color: var(--brand-600);
    background: var(--brand-50);
  }

  .eta strong {
    font: 800 16px/22px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 900px) {
    .body {
      grid-template-columns: 1fr;
    }

    .list {
      max-height: none;
    }

    .map-wrap {
      min-height: 340px;
      border-left: 0;
      border-top: 1px solid var(--border-default);
    }
  }
</style>
