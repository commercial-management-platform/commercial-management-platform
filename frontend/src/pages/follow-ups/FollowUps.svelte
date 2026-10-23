<script lang="ts">
  import FiltersMenu from '../../lib/components/FiltersMenu.svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import Pagination from '../../lib/components/Pagination.svelte'
  import StatCard from '../../lib/components/StatCard.svelte'
  import { can } from '../../lib/permissions.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import {
    FOLLOW_UP_STATUS_LABELS,
    completeFollowUp,
    followUpTime,
    listFollowUps,
    type ApiFollowUp,
    type FollowUpStatus,
  } from '../../lib/services/followUpsApi'
  import { getVisit, getVisitForm } from '../../lib/services/visitsApi'
  import { advisors } from '../../lib/stores/advisors.svelte'
  import { clientDirectory, errorText, useClientDirectory } from '../../lib/stores/clientDirectory.svelte'
  import { LiveCollection, fetchAllPages } from '../../lib/stores/liveCollection.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatDate, formatShortDate } from '../../lib/utils/format'
  import FollowUpEditModal from './FollowUpEditModal.svelte'

  // Seguimientos comerciales (HU-10). El asesor ve los suyos; el gestor, todos,
  // con filtro por asesor y fecha. Se crean al registrar una visita.

  const followUps = new LiveCollection<ApiFollowUp>(
    () => fetchAllPages((page, limit) => listFollowUps({ page, limit })),
    'No pudimos cargar los seguimientos.',
  )
  followUps.use()
  // El asesor no consulta la cartera: el nombre del cliente sale del formulario de la visita.
  if (can.isManager) useClientDirectory()
  advisors.load()

  const PAGE_SIZE = 10
  const STATUSES = Object.keys(FOLLOW_UP_STATUS_LABELS) as FollowUpStatus[]
  const BADGE: Record<FollowUpStatus, string> = { pending: '', overdue: 'danger', completed: 'deep' }

  let query = $state('')
  // Por defecto, lo que falta por hacer.
  let statuses = $state<FollowUpStatus[]>(['overdue', 'pending'])
  let advisorId = $state<number | ''>('')
  let from = $state('')
  let to = $state('')
  let page = $state(0)
  let editing = $state<ApiFollowUp | null>(null)
  let busyId = $state<number | null>(null)

  /** Cliente de cada visita (id o nombre): el seguimiento solo trae el id de la visita. */
  let clientByVisit = $state<Record<number, number | string>>({})
  $effect(() => {
    const missing = [...new Set(followUps.items.map((f) => f.visitId))].filter((id) => !(id in clientByVisit))
    for (const id of missing) {
      clientByVisit[id] = 0
      const lookup = can.isAdvisor
        ? getVisitForm(id).then((form) => form.client.tradeName || form.client.businessName)
        : getVisit(id).then((visit) => visit.clientId)
      lookup.then((client) => (clientByVisit[id] = client)).catch(() => {})
    }
  })

  const clientName = (visitId: number) => {
    const client = clientByVisit[visitId]
    if (typeof client === 'string') return client
    const found = clientDirectory.byId.get(client)
    return found ? clientDisplayName(found) : '…'
  }
  const day = (date: string) => `${date}T12:00:00`

  let totals = $derived({
    pending: followUps.items.filter((f) => f.status === 'pending').length,
    overdue: followUps.items.filter((f) => f.status === 'overdue').length,
    completed: followUps.items.filter((f) => f.status === 'completed').length,
  })

  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return followUps.items
      .filter(
        (f) =>
          (statuses.length === 0 || statuses.includes(f.status)) &&
          (advisorId === '' || f.responsibleAdvisorId === advisorId) &&
          (!from || f.nextDate >= from) &&
          (!to || f.nextDate <= to) &&
          (!q || `${f.activity} ${f.observation ?? ''} ${clientName(f.visitId)}`.toLowerCase().includes(q)),
      )
      .toSorted(
        (a, b) =>
          Number(a.completed) - Number(b.completed) ||
          (a.completed
            ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
            : `${a.nextDate} ${followUpTime(a)}`.localeCompare(`${b.nextDate} ${followUpTime(b)}`)),
      )
  })
  let visible = $derived(rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE))
  let activeFilters = $derived(statuses.length + (advisorId !== '' ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0))

  $effect(() => {
    void [query, statuses, advisorId, from, to]
    page = 0
  })

  function toggle(status: FollowUpStatus) {
    statuses = statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
  }

  async function complete(followUp: ApiFollowUp) {
    busyId = followUp.id
    try {
      followUps.upsert(await completeFollowUp(followUp.id))
      toasts.push({ tone: 'success', icon: 'check', title: 'Seguimiento completado', message: followUp.activity })
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo completar', message: errorText(e, 'Intenta de nuevo.') })
    } finally {
      busyId = null
    }
  }
</script>

<div class="list-page">
  <header class="page-intro">
    <div>
      <p class="eyebrow">Proceso comercial</p>
      <h1>Seguimientos</h1>
      <p class="subtitle">
        {can.isAdvisor
          ? 'Tus próximas actividades con los clientes visitados.'
          : 'Actividades pendientes después de cada visita y su cumplimiento.'}
      </p>
    </div>
  </header>

  {#if followUps.status === 'ready'}
    <div class="stats-grid">
      <StatCard label="Vencidos" value={totals.overdue} flash={followUps.highlights.kpi} />
      <StatCard label="Pendientes" value={totals.pending} flash={followUps.highlights.kpi} />
      <StatCard label="Completados" value={totals.completed} flash={followUps.highlights.kpi} />
    </div>

    <section class="card">
      <div class="table-toolbar">
        <label class="search-field">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Buscar actividad o cliente…" bind:value={query} />
        </label>
        <div class="actions">
          <FiltersMenu
            count={activeFilters}
            onclear={() => {
              statuses = []
              advisorId = from = to = ''
            }}
          >
            <p class="filter-title">Estado</p>
            {#each STATUSES as status (status)}
              <label class="filter-check">
                <input type="checkbox" checked={statuses.includes(status)} onchange={() => toggle(status)} />
                {FOLLOW_UP_STATUS_LABELS[status]}
              </label>
            {/each}
            {#if can.isManager}
              <p class="filter-title">Responsable</p>
              <select class="select" bind:value={advisorId}>
                <option value="">Todos los asesores</option>
                {#each advisors.list as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
              </select>
            {/if}
            <p class="filter-title">Fecha</p>
            <div class="range">
              <input class="input" type="date" bind:value={from} aria-label="Desde" />
              <input class="input" type="date" bind:value={to} min={from} aria-label="Hasta" />
            </div>
          </FiltersMenu>
        </div>
      </div>

      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Actividad</th>
              <th>Cliente</th>
              {#if can.isManager}<th>Responsable</th>{/if}
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each visible as followUp (followUp.id)}
              <tr class:flash={followUps.highlights[followUp.id]}>
                <td class="num">
                  {formatShortDate(day(followUp.nextDate))}
                  {#if followUpTime(followUp)}<small class="sub">{followUpTime(followUp)}</small>{/if}
                </td>
                <td class="activity">
                  <strong>{followUp.activity}</strong>
                  {#if followUp.observation}<small class="sub">{followUp.observation}</small>{/if}
                </td>
                <td>{clientName(followUp.visitId)}</td>
                {#if can.isManager}<td>{advisors.name(followUp.responsibleAdvisorId)}</td>{/if}
                <td>
                  <span class="badge {BADGE[followUp.status]}">{FOLLOW_UP_STATUS_LABELS[followUp.status]}</span>
                  {#if followUp.completedAt}<small class="sub">{formatDate(followUp.completedAt)}</small>{/if}
                </td>
                <td>
                  {#if !followUp.completed}
                    <div class="row-actions">
                      <button class="link-btn" disabled={busyId === followUp.id} onclick={() => complete(followUp)}>Completar</button>
                      <button class="link-btn" onclick={() => (editing = followUp)}>Editar</button>
                    </div>
                  {:else}
                    <span class="sub">—</span>
                  {/if}
                </td>
              </tr>
            {:else}
              <tr>
                <td class="empty" colspan={can.isManager ? 6 : 5}>
                  {#if followUps.items.length}
                    No hay seguimientos para los filtros seleccionados.
                  {:else}
                    Aún no hay seguimientos. Se programan al registrar una visita.
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Pagination bind:page total={rows.length} size={PAGE_SIZE} />
    </section>
  {:else if followUps.status === 'error'}
    <div class="card error-box">
      <p>{followUps.error}</p>
      <button class="btn btn-outline" onclick={() => followUps.refresh()}>Reintentar</button>
    </div>
  {:else}
    <div class="stats-grid">
      {#each Array(3) as _, i (i)}<div class="skeleton" style:height="98px"></div>{/each}
    </div>
    <div class="skeleton" style:height="420px"></div>
  {/if}
</div>

<FollowUpEditModal followUp={editing} onclose={() => (editing = null)} onsaved={(f) => followUps.upsert(f)} />

<style>
  .error-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  .sub {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
  }

  .activity {
    max-width: 360px;
  }

  .activity .sub {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-actions {
    display: flex;
    gap: 14px;
  }

  .range {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .range .input {
    min-width: 0;
  }
</style>
