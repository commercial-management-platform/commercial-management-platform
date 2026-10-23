<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { weekStatusLabel } from '../../lib/domain/routes'
  import { can } from '../../lib/permissions.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'
  import { routesStore, type RouteRow } from '../../lib/stores/routes.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatDate, percent } from '../../lib/utils/format'
  import RouteEditModal from './RouteEditModal.svelte'

  interface Props {
    row: RouteRow | null
    onclose: () => void
  }

  let { row, onclose }: Props = $props()

  let editing = $state(false)
  let busy = $state(false)
  let newClientId = $state<number | ''>('')

  let route = $derived(row?.route ?? null)
  let progress = $derived(row ? percent(row.realizadas, row.programadas) : 0)

  /** Clientes ya visitados esta semana dentro de la ruta. */
  let visited = $derived(
    new Set(
      routesStore.visits
        .filter((v) => v.routeId === route?.id && v.status === 'visited')
        .map((v) => v.clientId),
    ),
  )
  let nextIndex = $derived(row?.estado === 'en_curso' ? row.clientIds.findIndex((id) => !visited.has(id)) : -1)

  let available = $derived(
    routesStore.clients
      .filter((c) => c.active && !row?.clientIds.includes(c.id))
      .toSorted(
        (a, b) =>
          Number(b.zoneId === route?.zoneId) - Number(a.zoneId === route?.zoneId) ||
          clientDisplayName(a).localeCompare(clientDisplayName(b)),
      ),
  )

  const dateLabel = (date: string) => formatDate(`${date}T12:00:00-05:00`)

  async function run(action: () => Promise<unknown>, success?: string) {
    if (!route) return
    busy = true
    try {
      await action()
      if (success) toasts.push({ tone: 'success', icon: 'check', title: success, message: route.name })
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo guardar', message: errorText(e, 'Intenta de nuevo.') })
    } finally {
      busy = false
    }
  }

  function addClient() {
    if (!route || newClientId === '') return
    const routeId = route.id
    const clientId = newClientId
    run(async () => {
      await routesStore.addClient(routeId, clientId)
      newClientId = ''
    }, 'Cliente agregado')
  }

  function toggleStatus() {
    if (!route) return
    const status = route.status === 'active' ? 'inactive' : 'active'
    run(() => routesStore.update(route.id, { status }), status === 'active' ? 'Ruta activada' : 'Ruta desactivada')
  }
</script>

<Modal
  open={!!row && !editing}
  onclose={() => !editing && onclose()}
  title={route?.name ?? ''}
  subtitle={route ? catalogs.name('zones', route.zoneId) : ''}
  size={can.manageRoutes ? 'lg' : 'md'}
>
  {#if row && route}
    <div class="head">
      <span class="badge {row.estado}">{weekStatusLabel[row.estado]}</span>
      <span class="progress-label">
        {#if row.programadas}
          {row.realizadas} de {row.programadas} visitas de la semana · {progress}%
        {:else}
          Sin visitas programadas esta semana
        {/if}
      </span>
    </div>
    <div class="bar"><span style:width="{progress}%"></span></div>

    <dl>
      <div><dt>Asesor</dt><dd>{routesStore.advisorName(route.advisorId)}</dd></div>
      <div><dt>Días</dt><dd>{route.executionDays || '—'}{route.frequency ? ` · ${route.frequency.toLowerCase()}` : ''}</dd></div>
      <div>
        <dt>Horario</dt>
        <dd>{route.suggestedStartTime && route.suggestedEndTime ? `${route.suggestedStartTime} – ${route.suggestedEndTime}` : '—'}</dd>
      </div>
      <div class="full">
        <dt>Vigencia</dt>
        <dd>Desde {dateLabel(route.startDate)}{route.endDate ? ` hasta ${dateLabel(route.endDate)}` : ''}</dd>
      </div>
      {#if route.description}
        <div class="full"><dt>Descripción</dt><dd>{route.description}</dd></div>
      {/if}
    </dl>

    <ol class="stops">
      {#each row.clientIds as clientId, i (clientId)}
        {@const client = routesStore.clientById.get(clientId)}
        {@const done = visited.has(clientId)}
        {@const next = i === nextIndex}
        <li class:done class:next>
          <span class="marker">
            {#if done}<Icon name="check" size={14} strokeWidth={2.6} />{:else}{i + 1}{/if}
          </span>
          <span class="info">
            <strong>{client ? clientDisplayName(client) : `Cliente #${clientId}`}</strong>
            <small>{client?.address ?? ''}</small>
          </span>
          {#if next}<em>Siguiente</em>{/if}
          {#if can.manageRoutes}
            <span class="stop-actions">
              <button
                class="icon-btn"
                disabled={busy || i === 0}
                onclick={() => run(() => routesStore.moveClient(route.id, i, i - 1))}
                aria-label="Subir {client ? clientDisplayName(client) : ''}"
              >
                <Icon name="arrow-up" size={14} />
              </button>
              <button
                class="icon-btn"
                disabled={busy || i === row.clientIds.length - 1}
                onclick={() => run(() => routesStore.moveClient(route.id, i, i + 1))}
                aria-label="Bajar {client ? clientDisplayName(client) : ''}"
              >
                <Icon name="arrow-down" size={14} />
              </button>
              <button
                class="icon-btn danger"
                disabled={busy}
                onclick={() => run(() => routesStore.removeClient(route.id, clientId), 'Cliente retirado de la ruta')}
                aria-label="Retirar {client ? clientDisplayName(client) : ''}"
              >
                <Icon name="trash" size={14} />
              </button>
            </span>
          {/if}
        </li>
      {:else}
        <li class="empty">Esta ruta aún no tiene clientes.</li>
      {/each}
    </ol>

    {#if can.manageRoutes}
      <form
        class="add"
        onsubmit={(e) => {
          e.preventDefault()
          addClient()
        }}
      >
        <select class="select" bind:value={newClientId} aria-label="Cliente para agregar">
          <option value="">Agregar un cliente al final del recorrido…</option>
          {#each available as client (client.id)}
            <option value={client.id}>
              {clientDisplayName(client)}{client.zoneId === route.zoneId ? ' · en la zona' : ''}
            </option>
          {/each}
        </select>
        <button class="btn btn-outline" type="submit" disabled={busy || newClientId === ''}>
          <Icon name="plus" size={16} /> Agregar
        </button>
      </form>
    {/if}
  {/if}

  {#snippet footer()}
    {#if can.manageRoutes && route}
      <button class="btn btn-outline" onclick={toggleStatus} disabled={busy}>
        {route.status === 'active' ? 'Desactivar ruta' : 'Activar ruta'}
      </button>
      <button class="btn btn-primary" onclick={() => (editing = true)} disabled={busy}>
        <Icon name="pencil" size={16} /> Editar datos
      </button>
    {:else}
      <button class="btn btn-outline" onclick={onclose}>Cerrar</button>
    {/if}
  {/snippet}
</Modal>

{#if can.manageRoutes}
  <RouteEditModal route={editing ? route : null} onclose={() => (editing = false)} />
{/if}

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

  li.empty {
    font-size: 13px;
    color: var(--text-muted);
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

  .stop-actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    color: var(--text-secondary);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  }

  .icon-btn:hover:not(:disabled) {
    color: var(--text-brand);
    border-color: var(--brand-300);
  }

  .icon-btn.danger:hover:not(:disabled) {
    color: var(--danger);
    border-color: var(--danger);
  }

  .icon-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .add {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }

  .add .select {
    flex: 1;
    min-width: 0;
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

  .badge.inactiva {
    color: var(--neutral-500);
    background: transparent;
    border: 1px dashed var(--neutral-400);
  }

  @media (max-width: 560px) {
    dl {
      grid-template-columns: minmax(0, 1fr);
    }

    .add {
      flex-direction: column;
    }
  }
</style>
