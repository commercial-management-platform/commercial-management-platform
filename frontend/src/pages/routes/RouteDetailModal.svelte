<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { routeStatusLabel, zonaLabel } from '../../lib/domain/routes'
  import { routesStore } from '../../lib/stores/routes.svelte'
  import type { AssignedRoute } from '../../lib/types'
  import { percent } from '../../lib/utils/format'

  interface Props {
    route: AssignedRoute | null
    onclose: () => void
  }

  let { route, onclose }: Props = $props()

  let progress = $derived(route ? percent(route.completadas, route.stops.length) : 0)
</script>

<Modal open={!!route} {onclose} title={route?.nombre ?? ''} subtitle={route ? zonaLabel(route.zona) : ''}>
  {#if route}
    <div class="head">
      <span class="badge {route.estado}">{routeStatusLabel[route.estado]}</span>
      <span class="progress-label">{route.completadas} de {route.stops.length} paradas · {progress}%</span>
    </div>
    <div class="bar"><span style:width="{progress}%"></span></div>

    <dl>
      <div><dt>Asesor</dt><dd>{routesStore.asesorById.get(route.asesorId)?.nombre ?? '—'}</dd></div>
      <div><dt>Día</dt><dd>{route.dia} · {route.frecuencia.toLowerCase()}</dd></div>
      <div><dt>Horario</dt><dd>{route.horaInicio} – {route.horaFin}</dd></div>
      {#if route.descripcion}
        <div class="full"><dt>Descripción</dt><dd>{route.descripcion}</dd></div>
      {/if}
    </dl>

    <ol class="stops">
      {#each route.stops as stop, i (stop.clientId)}
        {@const client = routesStore.clientById.get(stop.clientId)}
        {@const done = i < route.completadas}
        {@const next = i === route.completadas && route.estado === 'en_curso'}
        <li class:done class:next>
          <span class="marker">
            {#if done}<Icon name="check" size={14} strokeWidth={2.6} />{:else}{i + 1}{/if}
          </span>
          <span class="info">
            <strong>{client?.nombre ?? stop.clientId}</strong>
            <small>{client?.direccion}</small>
          </span>
          {#if next}<em>Siguiente</em>{/if}
        </li>
      {/each}
    </ol>
  {/if}
</Modal>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .progress-label {
    font: 600 12px/18px var(--font-heading);
    color: var(--text-secondary);
  }

  .bar {
    height: 6px;
    margin-top: 10px;
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

  dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin: 20px 0 0;
  }

  .full {
    grid-column: 1 / -1;
  }

  dt {
    font: 600 11px/16px var(--font-heading);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  dd {
    margin: 2px 0 0;
  }

  .stops {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 300px;
    margin: 20px 0 0;
    padding: 0;
    list-style: none;
    overflow-y: auto;
  }

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
    border-radius: 10px;
  }

  li.next {
    background: var(--brand-50);
  }

  .marker {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    font: 700 11px var(--font-heading);
    color: var(--text-secondary);
    border-radius: 50%;
    background: var(--neutral-100);
  }

  .done .marker {
    color: #fff;
    background: var(--brand-600);
  }

  .next .marker {
    color: #fff;
    background: var(--brand-900);
  }

  .info {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    line-height: 1.35;
  }

  .info strong {
    font: 700 13px/18px var(--font-heading);
  }

  .done .info strong {
    color: var(--text-secondary);
  }

  small {
    font-size: 11px;
    color: var(--text-muted);
  }

  em {
    font: 700 11px var(--font-heading);
    font-style: normal;
    color: var(--text-brand);
  }

  .badge {
    padding: 3px 10px;
    font: 700 11px/16px var(--font-heading);
    border-radius: 999px;
    color: var(--neutral-700);
    background: var(--neutral-100);
  }

  .badge.completada {
    color: var(--brand-700);
    background: var(--brand-50);
  }
</style>
