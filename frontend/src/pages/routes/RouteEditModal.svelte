<script lang="ts">
  import Modal from '../../lib/components/Modal.svelte'
  import { DIAS, FRECUENCIAS, joinDays, splitDays } from '../../lib/domain/routes'
  import type { ApiRoute } from '../../lib/services/routesApi'
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'
  import { routesStore } from '../../lib/stores/routes.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { toMinutes } from '../../lib/utils/format'

  // Editar los datos de una ruta (HU-07, solo gestor). Los clientes y su orden
  // se gestionan desde el detalle.

  interface Props {
    route: ApiRoute | null
    onclose: () => void
  }

  let { route, onclose }: Props = $props()

  let name = $state('')
  let zoneId = $state<number | ''>('')
  let advisorId = $state<number | ''>('')
  let dias = $state<string[]>([])
  let frequency = $state('')
  let start = $state('')
  let end = $state('')
  let startDate = $state('')
  let endDate = $state('')
  let description = $state('')
  let error = $state('')
  let saving = $state(false)

  // Activos más el actual: una ruta conserva su asesor aunque se haya desactivado.
  let advisors = $derived(routesStore.advisors.filter((a) => a.status === 'active' || a.id === route?.advisorId))
  let zones = $derived(
    catalogs.zones.some((z) => z.id === route?.zoneId) || !route
      ? catalogs.zones
      : [...catalogs.zones, { id: route.zoneId, name: `Zona #${route.zoneId} (inactiva)`, active: false }],
  )

  $effect(() => {
    if (!route) return
    name = route.name
    zoneId = route.zoneId
    advisorId = route.advisorId
    dias = splitDays(route.executionDays)
    frequency = route.frequency ?? ''
    start = route.suggestedStartTime ?? ''
    end = route.suggestedEndTime ?? ''
    startDate = route.startDate
    endDate = route.endDate ?? ''
    description = route.description ?? ''
    error = ''
  })

  function toggleDia(dia: string) {
    dias = dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia]
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!route) return
    error = ''
    if (!name.trim()) return void (error = 'Ingresa un nombre.')
    if (zoneId === '' || advisorId === '') return void (error = 'Selecciona la zona y el asesor.')
    if (!dias.length) return void (error = 'Selecciona al menos un día.')
    if (!!start !== !!end) return void (error = 'Indica la hora inicial y la final, o ninguna.')
    if (start && end && toMinutes(end) <= toMinutes(start)) return void (error = 'La hora final debe ser posterior a la inicial.')
    if (endDate && endDate < startDate) return void (error = 'La fecha final no puede ser anterior a la inicial.')

    saving = true
    try {
      await routesStore.update(route.id, {
        name: name.trim(),
        zoneId,
        advisorId,
        executionDays: joinDays(dias),
        frequency: frequency || null,
        suggestedStartTime: start || null,
        suggestedEndTime: end || null,
        startDate,
        endDate: endDate || null,
        description: description.trim() || null,
      })
      toasts.push({ tone: 'success', icon: 'check', title: 'Ruta actualizada', message: name.trim() })
      onclose()
    } catch (e) {
      error = errorText(e, 'No pudimos guardar los cambios.')
    } finally {
      saving = false
    }
  }
</script>

<Modal open={!!route} {onclose} title="Editar ruta" subtitle={route?.name ?? ''}>
  <form id="edit-route" class="form" onsubmit={submit} novalidate>
    <label class="field full">
      Nombre
      <input class="input" bind:value={name} maxlength="120" required />
    </label>

    <label class="field">
      Zona
      <select class="select" bind:value={zoneId}>
        {#each zones as zone (zone.id)}<option value={zone.id}>{zone.name}</option>{/each}
      </select>
    </label>

    <label class="field">
      Asesor
      <select class="select" bind:value={advisorId}>
        {#each advisors as advisor (advisor.id)}
          <option value={advisor.id}>{advisor.name}{advisor.status === 'inactive' ? ' (inactivo)' : ''}</option>
        {/each}
      </select>
    </label>

    <fieldset class="field full days">
      <legend>Días de ejecución</legend>
      <div class="day-list">
        {#each DIAS as dia (dia)}
          <label class="day" class:on={dias.includes(dia)}>
            <input type="checkbox" checked={dias.includes(dia)} onchange={() => toggleDia(dia)} />
            {dia}
          </label>
        {/each}
      </div>
    </fieldset>

    <div class="row full">
      <label class="field">
        Frecuencia
        <select class="select" bind:value={frequency}>
          <option value="">Sin definir</option>
          {#each FRECUENCIAS as f (f)}<option>{f}</option>{/each}
          {#if frequency && !FRECUENCIAS.includes(frequency)}<option>{frequency}</option>{/if}
        </select>
      </label>
      <label class="field">
        Hora inicial
        <input class="input" type="time" bind:value={start} />
      </label>
      <label class="field">
        Hora final
        <input class="input" type="time" bind:value={end} />
      </label>
    </div>

    <label class="field">
      Vigente desde
      <input class="input" type="date" bind:value={startDate} required />
    </label>

    <label class="field">
      <span>Hasta <span class="muted">(opcional)</span></span>
      <input class="input" type="date" bind:value={endDate} min={startDate} />
    </label>

    <label class="field full">
      Descripción
      <textarea class="input" rows="3" bind:value={description}></textarea>
    </label>

    {#if error}<p class="error full" role="alert">{error}</p>{/if}
  </form>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="edit-route" disabled={saving}>
      {saving ? 'Guardando…' : 'Guardar cambios'}
    </button>
  {/snippet}
</Modal>

<style>
  .form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .field :global(.select),
  .field :global(.input) {
    width: 100%;
    font-weight: 400;
  }

  textarea.input {
    height: auto;
    padding: 10px 12px;
    resize: vertical;
  }

  .full {
    grid-column: 1 / -1;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .days {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .days legend {
    margin-bottom: 6px;
    padding: 0;
  }

  .day-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .day {
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 12px;
    font: 600 13px var(--font-heading);
    border: 1px solid var(--border-default);
    border-radius: 999px;
    cursor: pointer;
    user-select: none;
  }

  .day input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .day:has(input:focus-visible) {
    outline: 2px solid var(--brand-500);
    outline-offset: 2px;
  }

  .day.on {
    color: #fff;
    border-color: var(--brand-700);
    background: var(--brand-700);
  }

  .muted {
    font-weight: 400;
    color: var(--text-muted);
  }

  .error {
    font-size: 13px;
    color: var(--danger);
  }

  @media (max-width: 560px) {
    .form,
    .row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
