<script lang="ts">
  import { flip } from 'svelte/animate'
  import { fade, fly } from 'svelte/transition'
  import Icon from '../../lib/components/Icon.svelte'
  import { remainingMinutes } from '../../lib/domain/deliveries'
  import { dashboard } from '../../lib/stores/dashboard.svelte'
  import type { Delivery, DeliveryStatus } from '../../lib/types'
  import { formatTime } from '../../lib/utils/format'
  import RouteMap from './RouteMap.svelte'

  const statusLabel: Record<DeliveryStatus, string> = {
    en_camino: 'En camino',
    siguiente: 'Siguiente',
    programado: 'Programado',
  }

  /** La entrega en curso muestra la llegada estimada; las demás, su hora programada. */
  const arrival = (d: Delivery) =>
    d.status === 'en_camino' ? new Date(Date.now() + remainingMinutes(d) * 60_000) : new Date(d.programada)

  let selected = $derived(dashboard.selectedDelivery)
  let active = $derived(dashboard.activeDelivery)
</script>

<section class="card routes">
  <header>
    <span class="head-icon"><Icon name="truck" size={20} /></span>
    <div>
      <h2>Rutas de entrega</h2>
      <p>Recorrido programado para los pedidos de hoy</p>
    </div>
    <span class="badge">
      <span class="dot" class:live={dashboard.live}></span>
      {dashboard.deliveries.length} entregas activas
    </span>
  </header>

  <div class="body">
    <ol class="list">
      {#each dashboard.deliveries as delivery, i (delivery.id)}
        <li animate:flip={{ duration: 350 }} in:fly={{ y: 16, duration: 300 }} out:fade={{ duration: 200 }}>
          <button
            class="stop {delivery.status}"
            class:selected={selected?.id === delivery.id}
            class:flash={dashboard.highlights[delivery.id]}
            onclick={() => dashboard.selectDelivery(delivery.id)}
          >
            <span class="num">{i + 1}</span>
            <span class="info">
              <span class="row">
                <strong>{delivery.cliente}</strong>
                <time>{formatTime(arrival(delivery))}</time>
              </span>
              <span class="meta">{delivery.pedido} · {delivery.direccion}</span>
              <span class="status">{statusLabel[delivery.status]}</span>
              {#if delivery.status === 'en_camino'}
                <span class="progress"><span style:width="{delivery.progress * 100}%"></span></span>
              {/if}
            </span>
          </button>
        </li>
      {:else}
        <li class="empty">No hay entregas en curso.</li>
      {/each}
    </ol>

    <div class="map-wrap">
      <RouteMap />

      {#if selected}
        {#key selected.id}
          <div class="overlay destination" in:fade={{ duration: 200 }}>
            <p class="overline">Destino seleccionado</p>
            <strong>{selected.cliente}</strong>
            <p class="address"><Icon name="map-pin" size={14} /> {selected.direccion}</p>
          </div>
        {/key}
      {/if}

      {#if active}
        <div class="overlay eta">
          <span class="eta-icon"><Icon name="truck" size={18} /></span>
          <div>
            <p class="overline">Llegada estimada</p>
            <strong>{formatTime(arrival(active))} hrs</strong>
            <p class="remaining">
              {remainingMinutes(active) > 0 ? `Faltan ${remainingMinutes(active)} min` : 'Llegando…'}
            </p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .routes {
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
    font-size: 1.08rem;
    font-weight: 700;
    line-height: 36px;
  }

  header p {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    padding: 5px 12px;
    font-size: 0.78rem;
    font-weight: 600;
    white-space: nowrap;
    color: var(--brand-700);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .dot {
    width: 7px;
    height: 7px;
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

  .body {
    display: grid;
    grid-template-columns: 320px 1fr;
    min-height: 400px;
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
    padding: 14px 12px;
    text-align: left;
    border: 0;
    border-radius: 12px;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s;
  }

  .stop:hover {
    background: var(--bg-page);
  }

  .stop.selected {
    background: var(--brand-50);
  }

  .stop.flash {
    animation: live-flash 2.4s ease-out;
  }

  .num {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    border-radius: 50%;
    background: var(--bg-page);
  }

  .en_camino .num {
    color: #fff;
    background: var(--brand-700);
  }

  .info {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .row strong {
    font-size: 0.92rem;
    font-weight: 600;
  }

  time {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .meta {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status {
    margin-top: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .en_camino .status {
    color: var(--brand-600);
  }

  .progress {
    height: 4px;
    margin-top: 6px;
    border-radius: 999px;
    background: var(--brand-100);
    overflow: hidden;
  }

  .progress span {
    display: block;
    height: 100%;
    background: var(--brand-600);
    transition: width 1s linear;
  }

  .empty {
    padding: 24px 12px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .map-wrap {
    position: relative;
    /* Contiene los z-index de Leaflet para que no tapen la barra superior */
    isolation: isolate;
    min-height: 400px;
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
    font-size: 0.62rem;
    font-weight: 600;
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
    font-size: 0.92rem;
    font-weight: 600;
  }

  .address {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-size: 0.78rem;
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
    font-size: 0.95rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .remaining {
    font-size: 0.72rem;
    color: var(--brand-600);
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

  @media (max-width: 560px) {
    header {
      flex-wrap: wrap;
    }

    .badge {
      margin-left: 48px;
    }
  }
</style>
