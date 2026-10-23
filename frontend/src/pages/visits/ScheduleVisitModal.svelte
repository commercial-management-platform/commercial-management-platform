<script lang="ts">
  import Modal from '../../lib/components/Modal.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import { listRouteClients, type ApiRoute, type ApiRouteClient } from '../../lib/services/routesApi'
  import { businessDateTime, businessToday, generateRouteVisits, scheduleVisit } from '../../lib/services/visitsApi'
  import { clientDirectory, errorText } from '../../lib/stores/clientDirectory.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'

  // Programar visitas (HU-08, solo gestor). Siempre se parte de una ruta: el
  // backend pide el id del asesor y hoy solo se conoce a través de su ruta.

  interface Props {
    open: boolean
    routes: ApiRoute[]
    onclose: () => void
    onscheduled: () => void
  }

  let { open, routes, onclose, onscheduled }: Props = $props()

  let mode = $state<'single' | 'route'>('single')
  let routeId = $state<number | ''>('')
  let clientId = $state<number | ''>('')
  let date = $state(businessToday())
  let time = $state('09:00')
  let stops = $state<ApiRouteClient[] | null>(null)
  let error = $state('')
  let saving = $state(false)

  let activeRoutes = $derived(routes.filter((r) => r.status === 'active'))
  let route = $derived(routes.find((r) => r.id === routeId) ?? null)

  $effect(() => {
    if (!open) return
    mode = 'single'
    routeId = clientId = ''
    date = businessToday()
    time = '09:00'
    stops = null
    error = ''
  })

  async function selectRoute(id: number | '') {
    routeId = id
    clientId = ''
    stops = null
    if (id === '') return
    try {
      const list = await listRouteClients(id)
      if (routeId === id) stops = list
    } catch (e) {
      error = errorText(e, 'No pudimos cargar los clientes de la ruta.')
    }
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    error = ''
    if (!route) return void (error = 'Selecciona una ruta.')
    if (mode === 'single' && clientId === '') return void (error = 'Selecciona el cliente.')
    if (date < businessToday()) return void (error = 'La fecha no puede estar en el pasado.')
    saving = true
    try {
      if (mode === 'single') {
        await scheduleVisit({
          clientId: Number(clientId),
          advisorId: route.advisorId,
          routeId: route.id,
          scheduledDate: businessDateTime(date, time),
        })
        toasts.push({ tone: 'success', icon: 'calendar', title: 'Visita programada', message: route.name })
      } else {
        const result = await generateRouteVisits(route.id, date, route.suggestedStartTime ? undefined : time)
        const skipped = result.skipped.length
        toasts.push({
          tone: result.created.length ? 'success' : 'info',
          icon: 'calendar',
          title: `${result.created.length} visitas programadas`,
          message: skipped ? `${route.name} · ${skipped} omitidas (inactivas o ya programadas)` : route.name,
        })
      }
      onscheduled()
      onclose()
    } catch (e) {
      error = errorText(e, 'No se pudo programar. Intenta de nuevo.')
    } finally {
      saving = false
    }
  }

  const clientName = (id: number) => {
    const client = clientDirectory.byId.get(id)
    return client ? clientDisplayName(client) : `Cliente #${id}`
  }
</script>

<Modal {open} {onclose} title="Programar visita" subtitle="Agenda visitas a los clientes de una ruta.">
  <form id="schedule-visit" class="form" onsubmit={submit} novalidate>
    <div class="tabs full" role="tablist" aria-label="Tipo de programación">
      <button type="button" role="tab" aria-selected={mode === 'single'} class:active={mode === 'single'} onclick={() => (mode = 'single')}>
        Un cliente
      </button>
      <button type="button" role="tab" aria-selected={mode === 'route'} class:active={mode === 'route'} onclick={() => (mode = 'route')}>
        Toda la ruta
      </button>
    </div>

    <label class="field full">
      <span>Ruta</span>
      <select class="select" value={routeId} onchange={(e) => selectRoute(e.currentTarget.value ? Number(e.currentTarget.value) : '')}>
        <option value="">Selecciona una ruta</option>
        {#each activeRoutes as r (r.id)}
          <option value={r.id}>{r.name}{r.executionDays ? ` · ${r.executionDays}` : ''}</option>
        {/each}
      </select>
    </label>

    {#if mode === 'single'}
      <label class="field full">
        <span>Cliente</span>
        <select class="select" bind:value={clientId} disabled={!stops}>
          <option value="">{routeId === '' ? 'Primero elige la ruta' : stops ? 'Selecciona un cliente' : 'Cargando…'}</option>
          {#each stops ?? [] as stop (stop.id)}
            <option value={stop.clientId}>{stop.visitOrder}. {clientName(stop.clientId)}</option>
          {/each}
        </select>
        {#if stops?.length === 0}<small class="muted">Esta ruta aún no tiene clientes.</small>{/if}
      </label>
    {/if}

    <label class="field">
      <span>Fecha</span>
      <input class="input" type="date" min={businessToday()} bind:value={date} required />
    </label>

    {#if mode === 'single' || !route?.suggestedStartTime}
      <label class="field">
        <span>Hora</span>
        <input class="input" type="time" bind:value={time} required />
      </label>
    {:else}
      <div class="field">
        <span>Hora</span>
        <p class="muted hint">Desde las {route.suggestedStartTime}, según la ruta.</p>
      </div>
    {/if}

    {#if mode === 'route'}
      <p class="muted full">Se crea una visita por cada cliente activo de la ruta, en su orden. Los que ya tengan visita ese día se omiten.</p>
    {/if}

    {#if error}<p class="error full" role="alert">{error}</p>{/if}
  </form>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="schedule-visit" disabled={saving}>
      {saving ? 'Guardando…' : mode === 'single' ? 'Programar visita' : 'Programar ruta'}
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
    font-size: 0.85rem;
    font-weight: 600;
  }

  .field :global(.select),
  .field :global(.input) {
    width: 100%;
    font-weight: 400;
  }

  .full {
    grid-column: 1 / -1;
  }

  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 3px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
  }

  .tabs button {
    height: 34px;
    font: 600 13px/1 var(--font-heading);
    color: var(--text-secondary);
    border: 0;
    border-radius: 8px;
    background: none;
    cursor: pointer;
  }

  .tabs button.active {
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .muted {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-muted);
  }

  .hint {
    display: flex;
    align-items: center;
    min-height: 42px;
  }

  .error {
    font-size: 0.85rem;
    color: var(--danger);
  }
</style>
