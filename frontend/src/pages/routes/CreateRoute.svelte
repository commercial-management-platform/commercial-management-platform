<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import { router } from '../../lib/router.svelte'
  import { fromMinutes } from '../../lib/utils/format'
  import { joinDays } from '../../lib/domain/routes'
  import { MIN_STOPS, PartialRouteError, planner } from '../../lib/stores/routePlanner.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import AssignAdvisor from './AssignAdvisor.svelte'
  import ClientPicker from './ClientPicker.svelte'
  import RouteDesignCard from './RouteDesignCard.svelte'
  import RouteInfoForm from './RouteInfoForm.svelte'
  import RouteSummary from './RouteSummary.svelte'
  import Stepper from './Stepper.svelte'
  import StopsList from './StopsList.svelte'

  let picker: ClientPicker | undefined = $state()

  onMount(async () => {
    await planner.load()
    // "Nueva ruta" desde Rutas asignadas abre el formulario vacío.
    if (router.params.nueva) {
      planner.reset()
      router.go('rutas/crear')
    } else if (planner.restoredDraft) {
      toasts.push({ tone: 'info', icon: 'save', title: 'Borrador restaurado', message: planner.info.nombre || 'Ruta sin nombre' })
    }
  })

  /** Paso visible: 0 datos, 1 paradas, 2 asignación y confirmación. */
  let step = $state(0)

  const stepValid = (i: number) => planner.steps[i].done
  const canReach = (i: number) => planner.steps.slice(0, i).every((st) => st.done)

  function goToStep(i: number) {
    if (i > step && !canReach(i)) {
      planner.showErrors = true
      return
    }
    planner.showErrors = false
    step = i
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function next() {
    if (!stepValid(step)) {
      planner.showErrors = true
      if (step === 1) {
        toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'Faltan paradas', message: `Agrega al menos ${MIN_STOPS} clientes a la ruta.` })
      }
      return
    }
    goToStep(step + 1)
  }

  function saveDraft() {
    if (planner.saveDraft()) {
      toasts.push({ tone: 'success', icon: 'save', title: 'Borrador guardado', message: planner.info.nombre || 'Ruta sin nombre' })
    }
  }

  async function submit() {
    const nombre = planner.info.nombre
    const asesor = planner.advisor?.name
    try {
      const invalidStep = await planner.submit()
      if (invalidStep !== null) {
        step = Math.min(invalidStep, 2)
        return
      }
      toasts.push({ tone: 'success', icon: 'check', title: 'Ruta creada y asignada', message: `${nombre} · ${asesor}` })
      router.go('rutas/asignadas', { nueva: String(planner.lastCreatedId ?? '') })
    } catch (error) {
      if (error instanceof PartialRouteError) {
        // La ruta ya existe: se termina de completar desde su detalle.
        toasts.push({
          tone: 'warning',
          icon: 'alert-circle',
          title: 'Ruta creada sin todos sus clientes',
          message: `Faltaron ${error.missing} de ${nombre} (${error.message}). Agrégalos desde el detalle de la ruta.`,
        })
        router.go('rutas/asignadas', { nueva: String(error.route.id) })
        return
      }
      toasts.push({
        tone: 'warning',
        icon: 'alert-circle',
        title: 'No se pudo crear la ruta',
        message: error instanceof Error && error.message ? error.message : 'Intenta de nuevo.',
      })
    }
  }

  function newRoute() {
    planner.reset()
    step = 0
  }
</script>

<div class="page">
  <header class="intro">
    <div>
      <p class="eyebrow">Planeación comercial</p>
      <h1>Creación de rutas</h1>
      <p class="subtitle">Configura, diseña y asigna recorridos eficientes a tu equipo.</p>
    </div>
    {#if planner.status === 'ready'}
      <button class="btn btn-outline" onclick={newRoute}>
        <Icon name="rotate-ccw" size={16} /> Nueva ruta
      </button>
    {/if}
  </header>

  {#if planner.status === 'ready'}
    <Stepper steps={planner.steps} current={step} onselect={goToStep} />

    {#if step === 0}
      <RouteInfoForm />
    {:else if step === 1}
      <div class="stops-layout">
        <div class="picker"><ClientPicker bind:this={picker} /></div>
        <div class="main">
          <RouteDesignCard />
          <StopsList onadd={() => picker?.focus()} />
        </div>
      </div>
    {:else}
      <div class="confirm-layout">
        <div class="side">
          <AssignAdvisor />
          <RouteSummary />
        </div>
        <section class="card recap" aria-labelledby="recap-title">
          <h2 id="recap-title">Resumen de {planner.info.nombre || 'la ruta'}</h2>
          <dl>
            <div><dt>Zona</dt><dd>{planner.zone?.name ?? '—'}</dd></div>
            <div><dt>Días</dt><dd>{joinDays(planner.info.dias) || '—'} · {planner.info.frecuencia.toLowerCase()}</dd></div>
            <div><dt>Horario</dt><dd>{planner.info.horaInicio} – {planner.info.horaFin}</dd></div>
          </dl>
          <ol class="recap-stops">
            {#each planner.schedule as stop, i (stop.clientId)}
              <li>
                <span class="n">{i + 1}</span>
                <span class="name">{stop.client.nombre}</span>
                <span class="time">{fromMinutes(stop.llegada)}</span>
              </li>
            {/each}
          </ol>
        </section>
      </div>
    {/if}

    <div class="actions">
      <button class="btn btn-outline" onclick={() => goToStep(step - 1)} disabled={step === 0}>
        <Icon name="chevron-left" size={16} /> Atrás
      </button>
      <span class="spacer"></span>
      {#if planner.savedAt}
        <span class="saved"><Icon name="check" size={14} /> Borrador guardado</span>
      {/if}
      <button class="btn btn-outline" onclick={saveDraft}>Guardar borrador</button>
      {#if step < 2}
        <button class="btn btn-primary" onclick={next}>Continuar <Icon name="chevron-right" size={16} /></button>
      {:else}
        <button class="btn btn-primary" onclick={submit} disabled={planner.submitting}>
          {planner.submitting ? 'Creando…' : 'Crear y asignar ruta'}
        </button>
      {/if}
    </div>
  {:else if planner.status === 'error'}
    <div class="card error">
      <p>{planner.error}</p>
      <button class="btn btn-outline" onclick={() => planner.load()}>Reintentar</button>
    </div>
  {:else}
    <div class="skeleton" style:height="64px"></div>
    <div class="skeleton" style:height="420px"></div>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
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

  .stops-layout {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    align-items: start;
    gap: 24px;
  }

  .picker {
    position: sticky;
    top: 104px;
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-width: 0;
  }

  .confirm-layout {
    display: grid;
    grid-template-columns: 400px minmax(0, 1fr);
    align-items: start;
    gap: 24px;
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .recap {
    padding: 28px;
  }

  .recap h2 {
    font-size: 18px;
    line-height: 26px;
  }

  .recap dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin: 20px 0 0;
  }

  .recap dt {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .recap dd {
    margin: 2px 0 0;
    font: 700 15px/22px var(--font-heading);
  }

  .recap-stops {
    display: flex;
    flex-direction: column;
    margin: 24px 0 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--border-default);
  }

  .recap-stops li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border-default);
  }

  .recap-stops .n {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    font: 700 13px var(--font-heading);
    color: var(--brand-700);
    border-radius: 50%;
    background: var(--brand-50);
  }

  .recap-stops .name {
    flex: 1;
    font: 600 15px/22px var(--font-heading);
  }

  .recap-stops .time {
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
  }

  .actions {
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-inline: -4px;
    padding: 16px 4px;
    border-top: 1px solid var(--border-default);
    background: var(--bg-page);
  }

  .spacer {
    flex: 1;
  }

  .actions .btn {
    height: 48px;
    padding: 0 20px;
    font-size: 15px;
  }

  .saved {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-brand);
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

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  @media (max-width: 1100px) {
    .stops-layout,
    .confirm-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .picker {
      position: static;
    }
  }

  @media (max-width: 760px) {
    .intro {
      flex-direction: column;
      align-items: flex-start;
    }

    .recap dl {
      grid-template-columns: minmax(0, 1fr);
    }

    .actions {
      flex-wrap: wrap;
    }

    .actions .btn {
      flex: 1;
    }

    .spacer {
      display: none;
    }
  }
</style>
