<script lang="ts">
  import { flip } from 'svelte/animate'
  import { fade } from 'svelte/transition'
  import Icon from '../../lib/components/Icon.svelte'
  import { MIN_STOPS, planner, type ScheduledStop } from '../../lib/stores/routePlanner.svelte'
  import { fromMinutes } from '../../lib/utils/format'
  import EditStopModal from './EditStopModal.svelte'

  let { onadd }: { onadd: () => void } = $props()

  let editing = $state<ScheduledStop | null>(null)
  let dragIndex = $state<number | null>(null)
  let overIndex = $state<number | null>(null)

  function onDragStart(event: DragEvent, index: number) {
    dragIndex = index
    event.dataTransfer?.setData('text/plain', String(index))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  function onDrop(event: DragEvent, index: number) {
    event.preventDefault()
    if (dragIndex !== null) planner.moveStop(dragIndex, index)
    dragIndex = overIndex = null
  }

  /** Reordenar con el teclado desde el asa: flecha arriba / abajo. */
  function onGripKey(event: KeyboardEvent, index: number) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      planner.moveStop(index, index + (event.key === 'ArrowUp' ? -1 : 1))
    }
  }

  let missing = $derived(planner.showErrors && planner.stops.length < MIN_STOPS)
</script>

<section class="card stops" aria-labelledby="stops-title">
  <header>
    <div>
      <h2 id="stops-title">Orden de visitas</h2>
      <p>Arrastra para cambiar el orden o edita cada parada</p>
    </div>
    <button class="btn btn-soft add" onclick={onadd}>
      <Icon name="plus" size={16} strokeWidth={2.2} /> Agregar cliente
    </button>
  </header>

  {#if missing}
    <p class="warning" role="alert">
      <Icon name="alert-circle" size={16} /> La ruta necesita al menos {MIN_STOPS} paradas.
    </p>
  {/if}

  <ol class="rows">
    {#each planner.schedule as stop, i (stop.clientId)}
      <li
        class="row"
        class:dragging={dragIndex === i}
        class:over={overIndex === i && dragIndex !== i}
        draggable="true"
        ondragstart={(e) => onDragStart(e, i)}
        ondragover={(e) => {
          e.preventDefault()
          overIndex = i
        }}
        ondragleave={() => overIndex === i && (overIndex = null)}
        ondrop={(e) => onDrop(e, i)}
        ondragend={() => (dragIndex = overIndex = null)}
        animate:flip={{ duration: 250 }}
        out:fade={{ duration: 150 }}
      >
        <button
          class="grip"
          aria-label="Mover {stop.client.nombre}. Usa las flechas arriba y abajo."
          onkeydown={(e) => onGripKey(e, i)}
        >
          <Icon name="grip" size={16} />
        </button>
        <span class="num">{i + 1}</span>
        <span class="client">
          <strong>{stop.client.nombre}</strong>
          <small>{stop.client.tipo} · {stop.client.municipio}</small>
        </span>
        <span class="address">{stop.client.direccion}</span>
        <span class="time">
          <strong>{fromMinutes(stop.llegada)}</strong>
          <small>{stop.duracionVisita} min</small>
        </span>
        <span class="actions">
          <button class="edit" onclick={() => (editing = stop)}>Editar</button>
          <button class="remove" onclick={() => planner.removeStop(stop.clientId)} aria-label="Quitar {stop.client.nombre}">
            <Icon name="trash" size={18} />
          </button>
        </span>
      </li>
    {:else}
      <li class="empty">Aún no hay paradas. Usa “Agregar cliente” para empezar.</li>
    {/each}
  </ol>
</section>

<EditStopModal stop={editing} onclose={() => (editing = null)} />

<style>
  .stops {
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 24px 24px 18px;
  }

  h2 {
    font-size: 16px;
    line-height: 22px;
  }

  header p {
    font-size: 13px;
    color: var(--text-muted);
  }

  .add {
    height: 38px;
  }

  .warning {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 20px 12px;
    padding: 10px 12px;
    font-size: 14px;
    color: #b45309;
    border-radius: 10px;
    background: #fffbeb;
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--border-default);
  }

  .row {
    display: grid;
    grid-template-columns: 20px 30px minmax(0, 1.2fr) minmax(0, 1fr) 64px auto;
    align-items: center;
    gap: 14px;
    padding: 14px 24px 14px 16px;
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-surface);
    transition: background 0.15s;
  }

  .row:last-child {
    border-bottom: 0;
  }

  .row:hover {
    background: var(--bg-surface-soft);
  }

  .row.dragging {
    opacity: 0.4;
  }

  .row.over {
    box-shadow: inset 0 2px 0 var(--brand-500);
    background: var(--brand-50);
  }

  .grip {
    display: grid;
    place-items: center;
    padding: 2px 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    cursor: grab;
  }

  .grip:hover {
    color: var(--text-secondary);
  }

  .num {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    font: 700 13px var(--font-heading);
    color: #fff;
    border-radius: 50%;
    background: var(--brand-700);
  }

  .client,
  .time {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.35;
  }

  .client strong {
    font: 700 14px/18px var(--font-heading);
  }

  small {
    font-size: 12px;
    color: var(--text-muted);
  }

  .address {
    font-size: 14px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .time {
    align-items: flex-end;
  }

  .time strong {
    font: 700 14px/18px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .edit {
    padding: 4px 6px;
    font-size: 16px;
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .edit:hover {
    text-decoration: underline;
  }

  .remove {
    display: grid;
    place-items: center;
    padding: 6px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--danger);
    cursor: pointer;
  }

  .remove:hover {
    background: var(--danger-bg);
  }

  .empty {
    padding: 28px 20px;
    font-size: 14px;
    text-align: center;
    color: var(--text-muted);
  }

  @media (max-width: 640px) {
    .row {
      grid-template-columns: 20px 30px minmax(0, 1fr) auto;
      row-gap: 6px;
    }

    .address {
      display: none;
    }

    .actions {
      grid-column: 3 / -1;
      justify-content: flex-end;
    }

    header {
      flex-wrap: wrap;
    }
  }
</style>
