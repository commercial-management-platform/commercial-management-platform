<script lang="ts">
  import { untrack } from 'svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import { VISIT_STATUS_LABELS, businessToday, getAgenda, type ApiAgendaEntry } from '../../lib/services/visitsApi'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'
  import { formatTime } from '../../lib/utils/format'
  import VisitRecordModal from './VisitRecordModal.svelte'

  // Agenda del asesor (HU-08) y registro de sus visitas (HU-09).

  const dayLabel = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' })
  const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' })

  let period = $state<'day' | 'week'>('day')
  let date = $state(businessToday())
  let status = $state<'loading' | 'ready' | 'error'>('loading')
  let error = $state('')
  let entries = $state<ApiAgendaEntry[]>([])
  let recordingId = $state<number | null>(null)

  let today = $derived(businessToday())
  let totals = $derived({
    scheduled: entries.filter((e) => e.status === 'scheduled').length,
    visited: entries.filter((e) => e.status === 'visited').length,
    cancelled: entries.filter((e) => e.status === 'cancelled').length,
  })
  let days = $derived.by(() => {
    const groups = new Map<string, ApiAgendaEntry[]>()
    for (const entry of entries.toSorted((a, b) => Date.parse(a.scheduledDate) - Date.parse(b.scheduledDate))) {
      const key = dayKey.format(new Date(entry.scheduledDate))
      groups.set(key, [...(groups.get(key) ?? []), entry])
    }
    return [...groups.entries()]
  })

  let request = 0
  async function load() {
    const current = ++request
    status = entries.length ? status : 'loading'
    try {
      const data = await getAgenda(period, date)
      if (current !== request) return
      entries = data
      status = 'ready'
      error = ''
    } catch (e) {
      if (current !== request) return
      error = errorText(e, 'No pudimos cargar tu agenda.')
      status = 'error'
    }
  }

  // untrack: load() lee `entries` y `status`; solo debe repetirse al cambiar periodo o fecha.
  $effect(() => {
    void [period, date]
    untrack(load)
  })

  const canRecord = (entry: ApiAgendaEntry) => entry.status === 'scheduled' && dayKey.format(new Date(entry.scheduledDate)) === today
  const phoneOf = (entry: ApiAgendaEntry) => entry.primaryContact?.mobile ?? entry.primaryContact?.phone ?? null
</script>

<div class="page">
  <header class="intro">
    <div>
      <p class="eyebrow">Actividad comercial</p>
      <h1>Mi agenda</h1>
      <p class="subtitle">Tus visitas programadas. Regístralas el día que las realizas.</p>
    </div>
    <div class="toolbar">
      <div class="tabs" role="tablist" aria-label="Periodo">
        <button role="tab" aria-selected={period === 'day'} class:active={period === 'day'} onclick={() => (period = 'day')}>Día</button>
        <button role="tab" aria-selected={period === 'week'} class:active={period === 'week'} onclick={() => (period = 'week')}>Semana</button>
      </div>
      <input class="input" type="date" bind:value={date} aria-label="Fecha" />
      {#if date !== today}<button class="btn btn-outline" onclick={() => (date = today)}>Hoy</button>{/if}
      <button class="btn btn-outline icon" onclick={load} aria-label="Actualizar" title="Actualizar"><Icon name="rotate-ccw" size={16} /></button>
    </div>
  </header>

  <div class="stats">
    <article class="card stat"><p>Programadas</p><strong>{totals.scheduled}</strong></article>
    <article class="card stat"><p>Visitadas</p><strong>{totals.visited}</strong></article>
    <article class="card stat"><p>Canceladas</p><strong>{totals.cancelled}</strong></article>
  </div>

  {#if status === 'error'}
    <div class="card error">
      <p>{error}</p>
      <button class="btn btn-outline" onclick={load}>Reintentar</button>
    </div>
  {:else if status === 'loading'}
    <div class="skeleton" style:height="320px"></div>
  {:else if entries.length === 0}
    <div class="card empty">
      <Icon name="calendar" size={28} />
      <p>No tienes visitas {period === 'day' ? 'para este día' : 'esta semana'}.</p>
    </div>
  {:else}
    {#each days as [key, items] (key)}
      <section class="card day" aria-label={dayLabel.format(new Date(items[0].scheduledDate))}>
        <h2>
          {dayLabel.format(new Date(items[0].scheduledDate))}
          {#if key === today}<span class="today">Hoy</span>{/if}
        </h2>
        <ol>
          {#each items as entry (entry.id)}
            {@const phone = phoneOf(entry)}
            <li class:off={entry.status === 'cancelled'}>
              <div class="time">
                <strong>{formatTime(entry.scheduledDate)}</strong>
                {#if entry.visitOrder}<small>Parada {entry.visitOrder}</small>{/if}
              </div>
              <div class="info">
                <p class="name">{entry.client.businessName}</p>
                <p class="muted">{entry.client.address ?? 'Sin dirección'}</p>
                {#if entry.primaryContact}
                  <p class="muted">
                    {entry.primaryContact.name}
                    {#if phone}· <a href="tel:{phone.replace(/\s/g, '')}">{phone}</a>{/if}
                  </p>
                {/if}
              </div>
              <div class="tags">
                {#if entry.potential}<span class="badge soft">Potencial {entry.potential.name}</span>{/if}
                <span class="badge {entry.status}">{VISIT_STATUS_LABELS[entry.status]}</span>
              </div>
              <div class="action">
                {#if canRecord(entry)}
                  <button class="btn btn-primary" onclick={() => (recordingId = entry.id)}>
                    <Icon name="check" size={16} /> Registrar
                  </button>
                {:else if entry.status === 'scheduled'}
                  <span class="muted hint">Se registra el día de la visita</span>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      </section>
    {/each}
  {/if}
</div>

<VisitRecordModal visitId={recordingId} onclose={() => (recordingId = null)} onrecorded={load} />

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
    flex-wrap: wrap;
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

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .toolbar .input {
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
    background: var(--bg-surface);
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

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .stat {
    padding: 20px;
  }

  .stat p {
    font-size: 12px;
    color: var(--text-muted);
  }

  .stat strong {
    display: block;
    margin-top: 4px;
    font: 800 24px/32px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  .day {
    padding: 20px;
  }

  .day h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font: 700 15px/22px var(--font-heading);
    text-transform: capitalize;
  }

  .today {
    padding: 2px 8px;
    font-size: 11px;
    text-transform: none;
    color: #fff;
    border-radius: 999px;
    background: var(--brand-600);
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr) auto 150px;
    align-items: center;
    gap: 16px;
    padding: 14px 0;
    border-top: 1px solid var(--border-default);
  }

  li:first-child {
    border-top: 0;
  }

  li.off {
    opacity: 0.55;
  }

  .time strong {
    display: block;
    font: 700 15px/20px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  .time small,
  .muted {
    font-size: 12px;
    color: var(--text-muted);
  }

  .name {
    font: 700 14px/20px var(--font-heading);
  }

  .tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .action {
    display: flex;
    justify-content: flex-end;
  }

  .hint {
    text-align: right;
  }

  .badge {
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

  .badge.soft {
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--border-default);
  }

  .empty {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 48px 20px;
    color: var(--text-muted);
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  .skeleton {
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

  @media (max-width: 760px) {
    .stats {
      grid-template-columns: 1fr;
    }

    li {
      grid-template-columns: 64px minmax(0, 1fr);
    }

    .tags,
    .action {
      grid-column: 2;
      justify-content: flex-start;
    }
  }
</style>
