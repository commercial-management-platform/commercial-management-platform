<script lang="ts">
  import { untrack } from 'svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import { listRoutes, type ApiRoute } from '../../lib/services/routesApi'
  import {
    VISIT_STATUS_LABELS,
    businessDateTime,
    businessToday,
    cancelVisit,
    listVisits,
    rescheduleVisit,
    type ApiVisit,
    type VisitStatus,
  } from '../../lib/services/visitsApi'
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { clientDirectory, errorText, useClientDirectory } from '../../lib/stores/clientDirectory.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatDate, formatTime } from '../../lib/utils/format'
  import ScheduleVisitModal from './ScheduleVisitModal.svelte'

  // Visitas para el gestor (HU-08): consulta con filtros, programar, reprogramar y cancelar.

  useClientDirectory()

  const PAGE_SIZE = 20
  const STATUSES = Object.keys(VISIT_STATUS_LABELS) as VisitStatus[]

  let range = $state<'week' | 'date'>('week')
  let date = $state(businessToday())
  let statusFilter = $state<VisitStatus | ''>('')
  let zoneId = $state<number | ''>('')
  let page = $state(1)

  let status = $state<'loading' | 'ready' | 'error'>('loading')
  let error = $state('')
  let visits = $state<ApiVisit[]>([])
  let total = $state(0)
  let routes = $state<ApiRoute[]>([])

  let scheduleOpen = $state(false)
  let rescheduling = $state<ApiVisit | null>(null)
  let newDate = $state('')
  let newTime = $state('09:00')
  let busyId = $state<number | null>(null)

  let routeById = $derived(new Map(routes.map((r) => [r.id, r])))
  let pages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)))

  let request = 0
  async function load() {
    const current = ++request
    if (!visits.length) status = 'loading'
    try {
      const result = await listVisits({
        [range]: date,
        status: statusFilter || undefined,
        zoneId: zoneId === '' ? undefined : zoneId,
        page,
        limit: PAGE_SIZE,
      })
      if (current !== request) return
      visits = result.data
      total = result.total
      status = 'ready'
      error = ''
    } catch (e) {
      if (current !== request) return
      error = errorText(e, 'No pudimos cargar las visitas.')
      status = 'error'
    }
  }

  // Al cambiar un filtro se vuelve a la primera página.
  $effect(() => {
    void [range, date, statusFilter, zoneId]
    page = 1
  })
  $effect(() => {
    void [range, date, statusFilter, zoneId, page]
    untrack(load)
  })

  $effect(() => {
    untrack(() => {
      catalogs.load()
      listRoutes()
        .then((r) => (routes = r))
        .catch(() => {})
    })
  })

  const clientOf = (visit: ApiVisit) => clientDirectory.byId.get(visit.clientId)
  const clientName = (visit: ApiVisit) => {
    const client = clientOf(visit)
    return client ? clientDisplayName(client) : `Cliente #${visit.clientId}`
  }

  function openReschedule(visit: ApiVisit) {
    // Día de la visita en hora de Colombia (UTC-5); si ya pasó, se propone hoy.
    const day = new Date(Date.parse(visit.scheduledDate) - 5 * 3_600_000).toISOString().slice(0, 10)
    newDate = day < businessToday() ? businessToday() : day
    newTime = formatTime(visit.scheduledDate)
    rescheduling = visit
  }

  async function saveReschedule(event: SubmitEvent) {
    event.preventDefault()
    if (!rescheduling) return
    busyId = rescheduling.id
    try {
      await rescheduleVisit(rescheduling.id, businessDateTime(newDate, newTime))
      toasts.push({ tone: 'success', icon: 'calendar', title: 'Visita reprogramada', message: clientName(rescheduling) })
      rescheduling = null
      load()
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo reprogramar', message: errorText(e, 'Intenta de nuevo.') })
    } finally {
      busyId = null
    }
  }

  async function cancel(visit: ApiVisit) {
    if (!confirm(`¿Cancelar la visita a ${clientName(visit)}?`)) return
    busyId = visit.id
    try {
      await cancelVisit(visit.id)
      toasts.push({ tone: 'info', icon: 'x', title: 'Visita cancelada', message: clientName(visit) })
      load()
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo cancelar', message: errorText(e, 'Intenta de nuevo.') })
    } finally {
      busyId = null
    }
  }
</script>

<div class="page">
  <header class="intro">
    <div>
      <p class="eyebrow">Actividad comercial</p>
      <h1>Visitas</h1>
      <p class="subtitle">Programa y sigue las visitas de los asesores.</p>
    </div>
    <button class="btn btn-primary" onclick={() => (scheduleOpen = true)}>
      <Icon name="plus" size={16} strokeWidth={2.2} /> Programar visita
    </button>
  </header>

  <section class="card list" aria-label="Listado de visitas">
    <header class="list-head">
      <div class="tabs" role="tablist" aria-label="Rango">
        <button role="tab" aria-selected={range === 'week'} class:active={range === 'week'} onclick={() => (range = 'week')}>Semana</button>
        <button role="tab" aria-selected={range === 'date'} class:active={range === 'date'} onclick={() => (range = 'date')}>Día</button>
      </div>
      <div class="controls">
        <input class="input" type="date" bind:value={date} aria-label={range === 'week' ? 'Un día de la semana' : 'Día'} />
        <select class="select" bind:value={statusFilter} aria-label="Estado">
          <option value="">Todos los estados</option>
          {#each STATUSES as s (s)}<option value={s}>{VISIT_STATUS_LABELS[s]}</option>{/each}
        </select>
        <select class="select" bind:value={zoneId} aria-label="Zona">
          <option value="">Todas las zonas</option>
          {#each catalogs.zones as z (z.id)}<option value={z.id}>{z.name}</option>{/each}
        </select>
        <button class="btn btn-outline icon" onclick={load} aria-label="Actualizar" title="Actualizar"><Icon name="rotate-ccw" size={16} /></button>
      </div>
    </header>

    {#if status === 'error'}
      <div class="error">
        <p>{error}</p>
        <button class="btn btn-outline" onclick={load}>Reintentar</button>
      </div>
    {:else if status === 'loading'}
      <div class="skeleton" style:height="320px"></div>
    {:else}
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Ruta</th>
              <th>Asesor</th>
              <th>Estado</th>
              <th>Ubicación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each visits as visit (visit.id)}
              {@const client = clientOf(visit)}
              {@const route = visit.routeId !== null ? routeById.get(visit.routeId) : undefined}
              <tr class:off={visit.status === 'cancelled'}>
                <td class="date">
                  {formatDate(visit.scheduledDate)}
                  <small>{formatTime(visit.scheduledDate)}</small>
                </td>
                <td class="name">
                  {clientName(visit)}
                  <small>{client ? catalogs.name('zones', client.zoneId) || client.municipality || '' : ''}</small>
                </td>
                <td>
                  {#if route}{route.name}{#if visit.visitOrder}<small>Parada {visit.visitOrder}</small>{/if}{:else}<span class="muted">Fuera de ruta</span>{/if}
                </td>
                <!-- El backend aún no expone el nombre del asesor: solo su id. -->
                <td>Asesor #{visit.advisorId}</td>
                <td><span class="badge {visit.status}">{VISIT_STATUS_LABELS[visit.status]}</span></td>
                <td>
                  {#if visit.status !== 'visited'}
                    <span class="muted">—</span>
                  {:else if visit.locationConfirmed}
                    <span class="ok"><Icon name="check" size={14} /> Confirmada</span>
                  {:else}
                    <span class="muted">Sin confirmar</span>
                  {/if}
                </td>
                <td class="actions">
                  {#if visit.status === 'scheduled'}
                    <button class="link" onclick={() => openReschedule(visit)} disabled={busyId === visit.id}>Reprogramar</button>
                    <button class="link danger" onclick={() => cancel(visit)} disabled={busyId === visit.id}>Cancelar</button>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr><td class="empty" colspan="7">No hay visitas para los filtros seleccionados.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if total > PAGE_SIZE}
        <footer class="pager">
          <span>Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}</span>
          <div>
            <button class="page-btn" onclick={() => page--} disabled={page === 1} aria-label="Página anterior">
              <Icon name="chevron-left" size={16} />
            </button>
            <span class="page-num">{page} / {pages}</span>
            <button class="page-btn" onclick={() => page++} disabled={page >= pages} aria-label="Página siguiente">
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        </footer>
      {/if}
    {/if}
  </section>
</div>

<ScheduleVisitModal open={scheduleOpen} {routes} onclose={() => (scheduleOpen = false)} onscheduled={load} />

<Modal
  open={!!rescheduling}
  onclose={() => (rescheduling = null)}
  title="Reprogramar visita"
  subtitle={rescheduling ? clientName(rescheduling) : ''}
>
  <form id="reschedule-visit" class="form" onsubmit={saveReschedule}>
    <label class="field">
      <span>Fecha</span>
      <input class="input" type="date" min={businessToday()} bind:value={newDate} required />
    </label>
    <label class="field">
      <span>Hora</span>
      <input class="input" type="time" bind:value={newTime} required />
    </label>
  </form>
  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={() => (rescheduling = null)}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="reschedule-visit" disabled={busyId !== null}>Guardar</button>
  {/snippet}
</Modal>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    max-width: var(--content-max);
    margin-inline: auto;
  }

  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
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

  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 20px;
  }

  .controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .controls .input {
    width: 160px;
  }

  .icon {
    width: 42px;
    padding: 0;
  }

  .tabs {
    display: flex;
    padding: 3px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
  }

  .tabs button {
    height: 34px;
    padding: 0 14px;
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

  .scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 860px;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    padding: 12px 20px;
    font: 600 11px/16px var(--font-heading);
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--bg-surface-soft);
    border-block: 1px solid var(--border-default);
  }

  td {
    padding: 14px 20px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-default);
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:hover {
    background: var(--bg-surface-soft);
  }

  tr.off td {
    opacity: 0.6;
  }

  td small {
    display: block;
    font-size: 11px;
    color: var(--text-muted);
  }

  .name {
    font: 700 13px/18px var(--font-heading);
    color: var(--text-primary);
  }

  .date {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .muted {
    color: var(--text-muted);
  }

  .ok {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--brand-700);
  }

  .badge {
    display: inline-block;
    padding: 3px 10px;
    font: 700 11px/16px var(--font-heading);
    white-space: nowrap;
    border-radius: 999px;
    color: var(--neutral-700);
    background: var(--neutral-100);
  }

  .badge.visited {
    color: var(--brand-700);
    background: var(--brand-100);
  }

  .badge.scheduled {
    color: #1d4ed8;
    background: #eff6ff;
  }

  .actions {
    white-space: nowrap;
  }

  .link {
    padding: 0;
    margin-right: 12px;
    font: 700 13px/18px var(--font-heading);
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .link.danger {
    color: var(--danger);
  }

  .link:hover:not(:disabled) {
    text-decoration: underline;
  }

  .link:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .pager {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    font-size: 12px;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-default);
  }

  .pager div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-btn {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    background: var(--bg-surface);
    cursor: pointer;
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-num {
    min-width: 48px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  .skeleton {
    margin: 0 20px 20px;
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

  .field :global(.input) {
    width: 100%;
    font-weight: 400;
  }

  @media (max-width: 760px) {
    .intro {
      flex-direction: column;
      align-items: flex-start;
    }

    .list-head {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
