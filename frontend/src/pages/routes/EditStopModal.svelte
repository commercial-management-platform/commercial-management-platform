<script lang="ts">
  import Modal from '../../lib/components/Modal.svelte'
  import { planner, type ScheduledStop } from '../../lib/stores/routePlanner.svelte'
  import { fromMinutes } from '../../lib/utils/format'

  interface Props {
    stop: ScheduledStop | null
    onclose: () => void
  }

  let { stop, onclose }: Props = $props()

  const DURACIONES = [15, 30, 45, 60, 90, 120]

  let duracion = $state(30)
  let objetivo = $state('')

  $effect(() => {
    if (stop) {
      duracion = stop.duracionVisita
      objetivo = stop.objetivo ?? ''
    }
  })

  function save(event: SubmitEvent) {
    event.preventDefault()
    if (!stop) return
    planner.updateStop(stop.clientId, { duracionVisita: duracion, objetivo: objetivo.trim() || undefined })
    onclose()
  }
</script>

<Modal open={!!stop} {onclose} title={stop?.client.nombre ?? ''} subtitle="Editar parada">
  {#if stop}
    <form id="edit-stop" class="form" onsubmit={save}>
      <p class="hint">
        Llegada estimada <strong>{fromMinutes(stop.llegada)}</strong> · {stop.client.direccion}
      </p>

      <label class="field">
        <span>Duración de la visita</span>
        <select class="select" bind:value={duracion}>
          {#each DURACIONES as d (d)}<option value={d}>{d} minutos</option>{/each}
        </select>
      </label>

      <label class="field">
        <span>Objetivo de la visita <em>(opcional)</em></span>
        <textarea class="input" rows="3" bind:value={objetivo} placeholder="Presentar catálogo, cobrar factura…"
        ></textarea>
      </label>
    </form>
  {/if}

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="edit-stop">Guardar cambios</button>
  {/snippet}
</Modal>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .hint {
    padding: 10px 12px;
    font-size: 13px;
    color: var(--text-secondary);
    border-radius: 10px;
    background: var(--bg-surface-soft);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field span {
    font: 600 12px/18px var(--font-heading);
  }

  .field em {
    font-style: normal;
    font-weight: 400;
    color: var(--text-muted);
  }

  .field :global(.select),
  textarea {
    width: 100%;
  }

  textarea.input {
    height: auto;
    padding: 10px 12px;
    resize: vertical;
  }
</style>
