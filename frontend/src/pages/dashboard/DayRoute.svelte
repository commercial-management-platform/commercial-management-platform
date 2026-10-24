<script lang="ts">
  import { fade } from 'svelte/transition'
  import Icon from '../../lib/components/Icon.svelte'
  import VisitMap, { type MapStop } from '../../lib/components/map/VisitMap.svelte'
  import { addDays, businessDay, byRouteOrder } from '../../lib/domain/tracking'
  import { can } from '../../lib/permissions.svelte'
  import { VISIT_STATUS_LABELS, businessToday, type ApiVisit, type VisitStatus } from '../../lib/services/visitsApi'
  import { advisors } from '../../lib/stores/advisors.svelte'
  import { dashboard } from '../../lib/stores/dashboard.svelte'
  import { operation } from '../../lib/stores/operation.svelte'
  import { formatTime } from '../../lib/utils/format'
  import VisitRecordModal from '../visits/VisitRecordModal.svelte'

  // Agenda y mapa de la ruta de un día (HU-11 y HU-15 CA-04/CA-05).

  const STATUSES = Object.keys(VISIT_STATUS_LABELS) as VisitStatus[]
  const dayChip = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })

  let days = $derived(Array.from({ length: 7 }, (_, i) => addDays(operation.range.from, i)))
  let today = businessToday()

  // Hoy si cae en la semana consultada; si no, el lunes.
  let day = $state('')
  $effect(() => {
    const { from, to } = operation.range
    if (day < from || day > to) day = today >= from && today <= to ? today : from
  })

  let visitsByDay = $derived.by(() => {
    const groups = new Map<string, ApiVisit[]>()
    for (const visit of operation.visits) {
      const key = businessDay(visit.scheduledDate)
      groups.set(key, [...(groups.get(key) ?? []), visit])
    }
    return groups
  })
  let dayVisits = $derived(visitsByDay.get(day) ?? [])

  // Un recorrido es de un asesor: el gestor elige cuál ver (el asesor solo recibe los suyos).
  let dayAdvisors = $derived([...new Set(dayVisits.map((v) => v.advisorId))])
  let advisorChoice = $state<number | null>(null)
  let advisorId = $derived(
    advisorChoice !== null && dayAdvisors.includes(advisorChoice) ? advisorChoice : (dayAdvisors[0] ?? null),
  )

  let route = $derived(dayVisits.filter((v) => v.advisorId === advisorId).toSorted(byRouteOrder))

  const clientOf = (visit: ApiVisit) => operation.client(visit)
  const clientName = (visit: ApiVisit) => clientOf(visit)?.name ?? `Cliente #${visit.clientId}`

  let stops = $derived(
    route.flatMap((visit, i): MapStop[] => {
      const client = clientOf(visit)
      if (client?.latitude == null || client.longitude == null) return []
      return [{ visit, order: i + 1, latitude: client.latitude, longitude: client.longitude, label: clientName(visit) }]
    }),
  )
  let unlocated = $derived(route.filter((visit) => !stops.some((s) => s.visit.id === visit.id)))

  let selectedId = $state<number | null>(null)
  let selected = $derived(route.find((v) => v.id === selectedId) ?? null)
  let recordingId = $state<number | null>(null)

  let counts = $derived(
    Object.fromEntries(STATUSES.map((s) => [s, route.filter((v) => v.status === s).length])) as Record<VisitStatus, number>,
  )
</script>

<section class="card day-route">
  <header>
    <span class="head-icon"><Icon name="map-pin" size={20} /></span>
    <div class="title">
      <h2>Ruta del día</h2>
      <p>Agenda y recorrido de las visitas en el orden de la ruta</p>
    </div>
    <span class="badge">
      <span class="dot" class:live={dashboard.live}></span>
      {route.length} {route.length === 1 ? 'visita' : 'visitas'}
    </span>
  </header>

  <div class="toolbar">
    <div class="days" role="tablist" aria-label="Día de la semana">
      {#each days as d (d)}
        <button
          role="tab"
          aria-selected={d === day}
          class:active={d === day}
          class:today={d === today}
          onclick={() => {
            day = d
            selectedId = null
          }}
        >
          {dayChip.format(new Date(`${d}T12:00:00Z`)).replace('.', '')}
          <span class="count">{visitsByDay.get(d)?.length ?? 0}</span>
        </button>
      {/each}
    </div>

    {#if can.isManager && dayAdvisors.length > 1}
      <select
        class="select"
        aria-label="Asesor del recorrido"
        value={advisorId}
        onchange={(e) => {
          advisorChoice = Number(e.currentTarget.value)
          selectedId = null
        }}
      >
        {#each dayAdvisors as id (id)}
          <option value={id}>{advisors.name(id)}</option>
        {/each}
      </select>
    {:else if can.isManager && advisorId !== null}
      <span class="advisor"><Icon name="user-check" size={15} /> {advisors.name(advisorId)}</span>
    {/if}
  </div>

  <div class="body">
    <div class="agenda">
      {#if operation.status !== 'ready'}
        {#each Array(3) as _, i (i)}<div class="skeleton row-skeleton"></div>{/each}
      {:else}
        <ol>
          {#each route as visit, i (visit.id)}
            <li>
              <button
                class="stop {visit.status}"
                class:selected={visit.id === selectedId}
                class:flash={operation.highlights[visit.id]}
                onclick={() => (selectedId = visit.id)}
              >
                <span class="num">{i + 1}</span>
                <span class="info">
                  <span class="row">
                    <strong>{clientName(visit)}</strong>
                    <time>{formatTime(visit.scheduledDate)}</time>
                  </span>
                  <span class="meta">{clientOf(visit)?.address ?? 'Sin dirección'}</span>
                  <span class="status">{VISIT_STATUS_LABELS[visit.status]}</span>
                </span>
              </button>
            </li>
          {:else}
            <li class="empty">No hay visitas programadas para este día.</li>
          {/each}
        </ol>

        {#if unlocated.length}
          <div class="unlocated" role="note">
            <p><Icon name="alert-circle" size={15} /> {unlocated.length} sin ubicación en el mapa</p>
            <ul>
              {#each unlocated as visit (visit.id)}
                <li>{clientName(visit)} · {formatTime(visit.scheduledDate)}</li>
              {/each}
            </ul>
          </div>
        {/if}
      {/if}
    </div>

    <div class="map-wrap">
      <VisitMap {stops} {selectedId} onselect={(id) => (selectedId = id)} />

      <div class="overlay legend" aria-label="Leyenda de estados">
        {#each STATUSES as s (s)}
          <span><i class="swatch {s}"></i>{VISIT_STATUS_LABELS[s]} · {counts[s]}</span>
        {/each}
      </div>

      {#if selected}
        {#key selected.id}
          <div class="overlay detail" in:fade={{ duration: 160 }}>
            <button class="close" aria-label="Cerrar detalle" onclick={() => (selectedId = null)}>
              <Icon name="x" size={14} />
            </button>
            <p class="overline">{formatTime(selected.scheduledDate)} · {VISIT_STATUS_LABELS[selected.status]}</p>
            <strong>{clientName(selected)}</strong>
            <p class="address"><Icon name="map-pin" size={14} /> {clientOf(selected)?.address ?? 'Sin dirección'}</p>
            {#if selected.routeId !== null}
              <p class="address">Ruta: {operation.routeById.get(selected.routeId)?.name ?? `#${selected.routeId}`}</p>
            {/if}
            {#if can.isAdvisor && selected.status === 'scheduled'}
              <button class="btn btn-primary start" onclick={() => (recordingId = selected!.id)}>
                <Icon name="play" size={14} /> Iniciar visita
              </button>
            {/if}
          </div>
        {/key}
      {/if}
    </div>
  </div>
</section>

<VisitRecordModal visitId={recordingId} onclose={() => (recordingId = null)} onrecorded={() => operation.refresh()} />

<style>
  .day-route {
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 22px 24px 14px;
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

  .title {
    flex: 1;
    min-width: 0;
  }

  h2 {
    font-size: 1.08rem;
    font-weight: 700;
  }

  header p {
    margin-top: 2px;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    border-radius: 999px;
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--neutral-400);
  }

  .dot.live {
    background: var(--brand-600);
    animation: pulse 1.6s ease-in-out infinite;
  }

  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0 24px 16px;
  }

  .days {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .days button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font: 600 0.8rem var(--font-body);
    text-transform: capitalize;
    white-space: nowrap;
    color: var(--text-secondary);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 999px;
    cursor: pointer;
  }

  .days button.today {
    border-color: var(--border-brand);
  }

  .days button.active {
    color: var(--text-on-brand);
    background: var(--brand-600);
    border-color: var(--brand-600);
  }

  .days .count {
    min-width: 18px;
    padding: 0 5px;
    font-size: 0.7rem;
    text-align: center;
    border-radius: 999px;
    background: var(--bg-page);
    color: var(--text-secondary);
  }

  .days button.active .count {
    color: var(--brand-700);
    background: #fff;
  }

  .advisor {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .body {
    display: grid;
    grid-template-columns: minmax(260px, 340px) 1fr;
    border-top: 1px solid var(--border-default);
  }

  .agenda {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 460px;
    padding: 12px;
    overflow-y: auto;
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: 6px;
    list-style: none;
  }

  .stop {
    display: flex;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    color: inherit;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .stop:hover {
    background: var(--bg-page);
  }

  .stop.selected {
    background: var(--brand-50);
    border-color: var(--border-brand);
  }

  .stop.flash {
    animation: flash 2.4s ease;
  }

  @keyframes flash {
    from {
      background: var(--brand-100);
    }
  }

  .num {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    font: 700 12px var(--font-heading);
    color: #fff;
    border-radius: 50%;
  }

  .scheduled .num {
    background: var(--visit-scheduled);
  }

  .visited .num {
    background: var(--visit-visited);
  }

  .cancelled .num {
    background: var(--visit-cancelled);
  }

  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .row strong {
    font-size: 0.88rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .cancelled .info {
    opacity: 0.7;
  }

  .empty {
    padding: 24px 12px;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .unlocated {
    padding: 10px 12px;
    font-size: 0.8rem;
    color: #92400e;
    background: #fffbeb;
    border-radius: 10px;
  }

  .unlocated p {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }

  .unlocated ul {
    margin-top: 6px;
    padding-left: 22px;
    color: #a16207;
  }

  .row-skeleton {
    height: 62px;
    border-radius: 12px;
  }

  .map-wrap {
    position: relative;
    /* Contiene los z-index de Leaflet para que no tapen la barra superior */
    isolation: isolate;
    min-height: 420px;
    border-left: 1px solid var(--border-default);
  }

  .overlay {
    position: absolute;
    z-index: 500;
    padding: 10px 12px;
    background: var(--bg-surface);
    border-radius: 12px;
    box-shadow: 0 10px 24px -10px rgba(15, 23, 42, 0.3);
  }

  .legend {
    left: 12px;
    bottom: 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .swatch.scheduled {
    background: var(--visit-scheduled);
  }

  .swatch.visited {
    background: var(--visit-visited);
  }

  .swatch.cancelled {
    background: var(--visit-cancelled);
  }

  .detail {
    top: 12px;
    left: 12px;
    width: min(260px, calc(100% - 24px));
    padding-right: 32px;
  }

  .close {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    color: var(--text-muted);
    background: transparent;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
  }

  .overline {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .detail strong {
    display: block;
    margin-top: 4px;
    font-size: 0.92rem;
  }

  .address {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .start {
    width: 100%;
    margin-top: 10px;
  }

  /* En celular (uso en campo, CA-07) el mapa va primero y la agenda debajo. */
  @media (max-width: 900px) {
    .body {
      grid-template-columns: 1fr;
    }

    .map-wrap {
      order: -1;
      min-height: 340px;
      border-left: 0;
      border-bottom: 1px solid var(--border-default);
    }

    .agenda {
      max-height: none;
    }
  }

  @media (max-width: 640px) {
    header,
    .toolbar {
      padding-inline: 16px;
    }

    .badge {
      display: none;
    }
  }
</style>
