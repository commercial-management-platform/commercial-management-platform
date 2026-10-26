<script lang="ts">
  import { tick, untrack } from 'svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import {
    INTEREST_LEVEL_LABELS,
    INTEREST_REASON_LABELS,
    businessDateTime,
    businessTime,
    businessToday,
    getVisitForm,
    recordVisitOutcome,
    startVisit,
    type ApiStartVisit,
    type ApiVisitForm,
    type InterestLevel,
    type InterestReason,
  } from '../../lib/services/visitsApi'
  import OrderFormModal from '../orders/OrderFormModal.svelte'
  import QuoteFormModal from '../quotes/QuoteFormModal.svelte'
  import { visitCatalogs } from '../../lib/stores/catalogs.svelte'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'
  import type { VisitOrigin } from '../../lib/stores/commerce.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatTime, weekdayEs } from '../../lib/utils/format'

  // Formulario del asesor (HU-09): datos precargados por el backend, check-in con
  // la ubicación del dispositivo y registro del resultado.

  interface Props {
    visitId: number | null
    onclose: () => void
    onrecorded: () => void
  }

  let { visitId, onclose, onrecorded }: Props = $props()

  const GEO_TIMEOUT_MS = 10_000
  const LEVELS = Object.keys(INTEREST_LEVEL_LABELS) as InterestLevel[]
  const REASONS = Object.keys(INTEREST_REASON_LABELS) as InterestReason[]

  let form = $state<ApiVisitForm | null>(null)
  let loadError = $state('')
  let checkIn = $state<ApiStartVisit | null>(null)
  let starting = $state(false)
  let saving = $state(false)
  let showErrors = $state(false)

  let objectiveId = $state<number | ''>('')
  let typeId = $state<number | ''>('')
  let resultId = $state<number | ''>('')
  let interestLevel = $state<InterestLevel | ''>('')
  let interestReason = $state<InterestReason | ''>('')
  let observation = $state('')
  let competitor = $state('')
  // Próximo seguimiento (HU-10), opcional.
  let followUpOn = $state(false)
  let nextDate = $state('')
  let nextTime = $state('')
  let nextActivity = $state('')
  let nextObservation = $state('')
  // Horas de inicio y fin, opcionales (HU-09 CA-06). Si la visita se inició con
  // "Iniciar visita", el backend ya tiene la de inicio y no se pide.
  let startTime = $state('')
  let endTime = $state('')
  // Gestión comercial (HU-09 CA-08): al guardar se abre el formulario de cotización
  // o de pedido, vinculado a esta visita. Vive fuera del modal de la visita, que se cierra.
  let commercial = $state<'' | 'quote' | 'order'>('')
  let linked = $state<{ kind: 'quote' | 'order'; origin: VisitOrigin } | null>(null)

  $effect(() => {
    if (visitId === null) return
    const id = visitId
    form = checkIn = null
    loadError = ''
    objectiveId = typeId = resultId = interestLevel = interestReason = ''
    observation = competitor = ''
    followUpOn = false
    nextDate = nextTime = nextActivity = nextObservation = ''
    startTime = endTime = ''
    commercial = ''
    showErrors = false
    untrack(() => visitCatalogs.load())
    getVisitForm(id)
      .then((data) => visitId === id && (form = data))
      .catch((error) => visitId === id && (loadError = errorText(error, 'No pudimos cargar la visita.')))
  })

  let started = $derived(!!(checkIn?.startedAt ?? form?.visit.startedAt))
  let confirmed = $derived(checkIn?.locationConfirmed ?? form?.visit.locationConfirmed ?? false)
  let contact = $derived(form?.primaryContact ?? null)

  let errors = $derived.by(() => {
    const e: Record<string, string> = {}
    if (objectiveId === '') e.objective = 'Selecciona el objetivo.'
    if (typeId === '') e.type = 'Selecciona el tipo de visita.'
    if (resultId === '') e.result = 'Selecciona el resultado.'
    if (!interestLevel) e.interest = 'Indica el nivel de interés.'
    if (!observation.trim()) e.observation = 'Escribe una observación.'
    const startedAt = checkIn?.startedAt ?? form?.visit.startedAt
    const start = startedAt ? businessTime(startedAt) : startTime
    if (endTime && start && endTime < start) e.endTime = 'La hora de fin no puede ser antes del inicio.'
    if (followUpOn) {
      if (!nextDate) e.nextDate = 'Indica la fecha.'
      else if (nextDate < businessToday()) e.nextDate = 'La fecha no puede ser pasada.'
      if (!nextActivity.trim()) e.nextActivity = 'Describe la actividad.'
    }
    return e
  })
  let err = $derived(showErrors ? errors : {})

  /** Ubicación cruda del dispositivo; null si no hay permiso o no responde a tiempo. */
  function currentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    if (!('geolocation' in navigator)) return Promise.resolve(null)
    return new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS },
      ),
    )
  }

  async function start() {
    if (visitId === null) return
    starting = true
    try {
      checkIn = await startVisit(visitId, await currentPosition())
    } catch (error) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo iniciar la visita', message: errorText(error, 'Intenta de nuevo.') })
    } finally {
      starting = false
    }
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    showErrors = true
    if (visitId === null || Object.keys(errors).length) {
      // Con el formulario largo el error puede quedar fuera de la vista.
      await tick()
      document.querySelector('.field small')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    saving = true
    try {
      const nextFollowUp = followUpOn
        ? {
            nextDate,
            nextTime: nextTime || undefined,
            activity: nextActivity.trim(),
            observation: nextObservation.trim() || undefined,
          }
        : undefined
      await recordVisitOutcome(visitId, {
        visitObjectiveId: Number(objectiveId),
        visitTypeId: Number(typeId),
        visitResultId: Number(resultId),
        interestLevel: interestLevel as InterestLevel,
        interestReason: interestReason || undefined,
        observation: observation.trim(),
        competitorMentioned: competitor.trim() || undefined,
        startedAt: !started && startTime ? businessDateTime(businessToday(), startTime) : undefined,
        finishedAt: endTime ? businessDateTime(businessToday(), endTime) : undefined,
        nextFollowUp,
      })
      const client = form ? form.client.tradeName || form.client.businessName : ''
      toasts.push({
        tone: 'success',
        icon: 'check',
        title: followUpOn ? 'Visita y seguimiento registrados' : 'Visita registrada',
        message: client,
      })
      if (commercial && form) {
        linked = {
          kind: commercial,
          origin: { visitId, clientId: form.client.id, clientName: client, advisorId: form.advisor.id },
        }
      }
      onrecorded()
      onclose()
    } catch (error) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo registrar la visita', message: errorText(error, 'Intenta de nuevo.') })
    } finally {
      saving = false
    }
  }
</script>

<Modal
  open={visitId !== null}
  {onclose}
  size="lg"
  title={form ? form.client.tradeName || form.client.businessName : 'Registrar visita'}
  subtitle={form ? `${weekdayEs(form.week.weekday)} ${form.week.date} · Semana ${form.week.isoWeek} · ${formatTime(form.visit.scheduledDate)}` : ''}
>
  {#if loadError}
    <p class="error" role="alert">{loadError}</p>
  {:else if !form}
    <p class="muted">Cargando visita…</p>
  {:else}
    <dl class="summary">
      <div><dt>Dirección</dt><dd>{form.client.address ?? '—'}</dd></div>
      <div><dt>Ruta</dt><dd>{form.route?.name ?? 'Fuera de ruta'}{form.visit.visitOrder ? ` · parada ${form.visit.visitOrder}` : ''}</dd></div>
      <div><dt>Zona</dt><dd>{form.zone?.name ?? '—'}</dd></div>
      <div>
        <dt>Contacto</dt>
        <dd>
          {#if contact}
            {contact.name}
            {#if contact.mobile || contact.phone}
              · <a href="tel:{(contact.mobile ?? contact.phone ?? '').replace(/\s/g, '')}">{contact.mobile ?? contact.phone}</a>
            {/if}
          {:else}—{/if}
        </dd>
      </div>
    </dl>

    <section class="checkin" class:ok={started && confirmed} class:warn={started && !confirmed}>
      {#if started}
        <Icon name={confirmed ? 'check' : 'alert-circle'} size={18} />
        <div>
          <p class="strong">
            Visita iniciada{checkIn?.startedAt ?? form.visit.startedAt ? ` a las ${formatTime((checkIn?.startedAt ?? form.visit.startedAt)!)}` : ''}
          </p>
          <p class="muted">
            {#if confirmed}
              Ubicación confirmada{checkIn?.distance != null ? ` (a ${Math.round(checkIn.distance)} m del cliente)` : ''}.
            {:else if checkIn?.distance != null}
              Estás a {Math.round(checkIn.distance)} m del cliente; el radio permitido es {checkIn.checkInRadiusMeters} m. Puedes registrar igual.
            {:else}
              Sin ubicación confirmada (no se obtuvo la ubicación o el cliente no tiene coordenadas). Puedes registrar igual.
            {/if}
          </p>
        </div>
      {:else}
        <Icon name="map-pin" size={18} />
        <div>
          <p class="strong">Inicia la visita al llegar</p>
          <p class="muted">Usamos tu ubicación para confirmar que estás en el cliente. Es opcional.</p>
        </div>
        <button class="btn btn-outline" onclick={start} disabled={starting}>
          <Icon name="play" size={16} />{starting ? 'Iniciando…' : 'Iniciar visita'}
        </button>
      {/if}
    </section>

    <form id="visit-outcome" class="form" onsubmit={submit} novalidate>
      <label class="field">
        <span>Objetivo</span>
        <select class="select" class:invalid={err.objective} bind:value={objectiveId}>
          <option value="">Selecciona…</option>
          {#each visitCatalogs.visitObjectives as o (o.id)}<option value={o.id}>{o.name}</option>{/each}
        </select>
        {#if err.objective}<small>{err.objective}</small>{/if}
      </label>
      <label class="field">
        <span>Tipo de visita</span>
        <select class="select" class:invalid={err.type} bind:value={typeId}>
          <option value="">Selecciona…</option>
          {#each visitCatalogs.visitTypes as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select>
        {#if err.type}<small>{err.type}</small>{/if}
      </label>
      <label class="field">
        <span>Resultado</span>
        <select class="select" class:invalid={err.result} bind:value={resultId}>
          <option value="">Selecciona…</option>
          {#each visitCatalogs.visitResults as r (r.id)}<option value={r.id}>{r.name}</option>{/each}
        </select>
        {#if err.result}<small>{err.result}</small>{/if}
      </label>
      <label class="field">
        <span>Motivo del interés <em>(opcional)</em></span>
        <select class="select" bind:value={interestReason}>
          <option value="">Sin especificar</option>
          {#each REASONS as r (r)}<option value={r}>{INTEREST_REASON_LABELS[r]}</option>{/each}
        </select>
      </label>

      <fieldset class="field full">
        <legend>Nivel de interés</legend>
        <div class="segmented" class:invalid={err.interest}>
          {#each LEVELS as level (level)}
            <label class:selected={interestLevel === level}>
              <input type="radio" name="interest" value={level} bind:group={interestLevel} />
              {INTEREST_LEVEL_LABELS[level]}
            </label>
          {/each}
        </div>
        {#if err.interest}<small>{err.interest}</small>{/if}
      </fieldset>

      <label class="field full">
        <span>Observación</span>
        <textarea
          class="input"
          class:invalid={err.observation}
          rows="4"
          maxlength="2000"
          bind:value={observation}
          placeholder="¿Qué se habló? Acuerdos, necesidades, próximos pasos…"
        ></textarea>
        {#if err.observation}<small>{err.observation}</small>{/if}
      </label>

      <label class="field full">
        <span>Competencia mencionada <em>(opcional)</em></span>
        <input class="input" maxlength="255" bind:value={competitor} placeholder="Empresa o marca" />
      </label>

      {#if !started}
        <label class="field">
          <span>Hora de inicio <em>(opcional)</em></span>
          <input class="input" type="time" bind:value={startTime} />
        </label>
      {/if}
      <label class="field" class:full={started}>
        <span>Hora de fin <em>(opcional)</em></span>
        <input class="input" class:invalid={err.endTime} type="time" bind:value={endTime} />
        {#if err.endTime}<small>{err.endTime}</small>{/if}
      </label>

      <label class="field full">
        <span>Gestión comercial <em>(opcional)</em></span>
        <select class="select" bind:value={commercial}>
          <option value="">Ninguna</option>
          <option value="quote">Se generó una cotización</option>
          <option value="order">Se generó un pedido</option>
        </select>
        {#if commercial}
          <small class="hint">Al registrar la visita se abre el formulario, ya vinculado a esta visita.</small>
        {/if}
      </label>

      <fieldset class="field full next">
        <label class="toggle">
          <input type="checkbox" bind:checked={followUpOn} />
          Programar próximo seguimiento
        </label>
        {#if followUpOn}
          <div class="next-grid">
            <label class="field">
              <span>Fecha</span>
              <input class="input" class:invalid={err.nextDate} type="date" min={businessToday()} bind:value={nextDate} />
              {#if err.nextDate}<small>{err.nextDate}</small>{/if}
            </label>
            <label class="field">
              <span>Hora <em>(opcional)</em></span>
              <input class="input" type="time" bind:value={nextTime} />
            </label>
            <label class="field full">
              <span>Actividad</span>
              <input class="input" class:invalid={err.nextActivity} maxlength="255" bind:value={nextActivity} placeholder="Ej. Enviar cotización, llamar al comprador…" />
              {#if err.nextActivity}<small>{err.nextActivity}</small>{/if}
            </label>
            <label class="field full">
              <span>Observación <em>(opcional)</em></span>
              <input class="input" maxlength="2000" bind:value={nextObservation} />
            </label>
          </div>
        {/if}
      </fieldset>

      {#if visitCatalogs.status === 'error'}
        <p class="error full">No pudimos cargar los catálogos de visita. Cierra y vuelve a intentarlo.</p>
      {/if}
    </form>
  {/if}

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="visit-outcome" disabled={!form || saving}>
      <Icon name="save" size={16} />{saving ? 'Guardando…' : 'Registrar visita'}
    </button>
  {/snippet}
</Modal>

<!-- Al crearse, se refresca quien abrió la visita para que la tabla de seguimiento muestre la cotización o el pedido. -->
<QuoteFormModal
  open={linked?.kind === 'quote'}
  fromVisit={linked?.origin}
  onclose={() => (linked = null)}
  oncreated={() => onrecorded()}
/>
<OrderFormModal
  open={linked?.kind === 'order'}
  fromVisit={linked?.origin}
  onclose={() => (linked = null)}
  oncreated={() => onrecorded()}
/>

<style>
  .summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    margin: 0;
  }

  dt {
    font-size: 11px;
    color: var(--text-muted);
  }

  dd {
    margin: 2px 0 0;
    font-weight: 500;
  }

  .checkin {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0;
    padding: 14px 16px;
    color: var(--text-secondary);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    background: var(--bg-surface-soft);
  }

  .checkin > div {
    flex: 1;
    min-width: 0;
  }

  .checkin.ok {
    color: var(--brand-700);
    border-color: var(--brand-100);
    background: var(--brand-50);
  }

  .checkin.warn {
    color: #b45309;
    border-color: #fde68a;
    background: #fffbeb;
  }

  .strong {
    font: 700 14px/20px var(--font-heading);
    color: var(--text-primary);
  }

  .muted {
    font-size: 12px;
    color: var(--text-muted);
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
    min-width: 0;
    margin: 0;
    padding: 0;
    font-size: 0.85rem;
    font-weight: 600;
    border: 0;
  }

  .field legend {
    margin-bottom: 6px;
    padding: 0;
  }

  .field em {
    font-style: normal;
    font-weight: 400;
    color: var(--text-muted);
  }

  .field small {
    font-weight: 400;
    color: var(--danger);
  }

  .field small.hint {
    color: var(--text-muted);
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

  .invalid {
    border-color: var(--danger);
  }

  .segmented {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    border-radius: 10px;
  }

  .segmented label {
    position: relative;
    display: grid;
    place-items: center;
    height: 40px;
    font-weight: 600;
    color: var(--text-secondary);
    border: 1px solid var(--border-default);
    border-radius: 10px;
    cursor: pointer;
  }

  .segmented.invalid label {
    border-color: var(--danger);
  }

  .segmented label.selected {
    color: var(--brand-700);
    border-color: var(--brand-500);
    background: var(--brand-50);
  }

  .segmented input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .segmented label:focus-within {
    box-shadow: var(--ring);
  }

  .next {
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid var(--border-default);
    border-radius: 12px;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .next-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  @media (max-width: 560px) {
    .next-grid {
      grid-template-columns: 1fr;
    }
  }

  .error {
    font-size: 0.85rem;
    color: var(--danger);
  }

  @media (max-width: 640px) {
    .summary,
    .form {
      grid-template-columns: 1fr;
    }

    .checkin {
      flex-wrap: wrap;
    }
  }
</style>
