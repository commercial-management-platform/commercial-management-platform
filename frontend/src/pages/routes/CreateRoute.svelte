<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import { router } from '../../lib/router.svelte'
  import { planner } from '../../lib/stores/routePlanner.svelte'
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

  /** Lleva al usuario a la sección de cada paso. */
  function goToStep(index: number) {
    if (index === 0) {
      const el = document.getElementById('route-info')
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el?.querySelector<HTMLElement>('input, select')?.focus({ preventScroll: true })
    } else if (index === 1) {
      picker?.focus()
    } else {
      const select = document.getElementById('asesor-select')
      select?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      select?.focus({ preventScroll: true })
    }
  }

  function saveDraft() {
    if (planner.saveDraft()) {
      toasts.push({ tone: 'success', icon: 'save', title: 'Borrador guardado', message: planner.info.nombre || 'Ruta sin nombre' })
    }
  }

  async function submit() {
    const nombre = planner.info.nombre
    const asesor = planner.asesor?.nombre
    try {
      const invalidStep = await planner.submit()
      if (invalidStep !== null) {
        goToStep(invalidStep)
        return
      }
      toasts.push({ tone: 'success', icon: 'check', title: 'Ruta creada y asignada', message: `${nombre} · ${asesor}` })
      router.go('rutas/asignadas', { nueva: planner.lastCreatedId ?? '' })
    } catch {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo crear la ruta', message: 'Intenta de nuevo.' })
    }
  }

  function newRoute() {
    planner.reset()
    goToStep(0)
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
    <Stepper steps={planner.steps} current={planner.currentStep} onselect={goToStep} />

    <div class="layout">
      <div class="info"><RouteInfoForm /></div>

      <div class="main">
        <RouteDesignCard />
        <StopsList onadd={() => picker?.focus()} />
        <div class="actions">
          {#if planner.savedAt}
            <span class="saved"><Icon name="check" size={14} /> Borrador guardado</span>
          {/if}
          <button class="btn btn-outline" onclick={saveDraft}>Guardar borrador</button>
          <button class="btn btn-primary" onclick={submit} disabled={planner.submitting}>
            {#if planner.submitting}
              Creando…
            {:else if planner.currentStep === 3}
              Crear y asignar ruta
            {:else}
              Continuar <Icon name="chevron-right" size={16} />
            {/if}
          </button>
        </div>
      </div>

      <div class="side">
        <ClientPicker bind:this={picker} />
        <AssignAdvisor />
        <RouteSummary />
      </div>
    </div>
  {:else if planner.status === 'error'}
    <div class="card error">
      <p>No pudimos cargar los datos de planeación.</p>
      <button class="btn btn-outline" onclick={() => planner.load()}>Reintentar</button>
    </div>
  {:else}
    <div class="skeleton" style:height="64px"></div>
    <div class="layout">
      <div class="skeleton info" style:height="620px"></div>
      <div class="skeleton main" style:height="620px"></div>
      <div class="skeleton side" style:height="620px"></div>
    </div>
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1240px;
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

  .layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr) 260px;
    grid-template-areas: 'info main side';
    align-items: start;
    gap: 20px;
  }

  .info {
    grid-area: info;
  }

  .main {
    grid-area: main;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .side {
    grid-area: side;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
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
    margin-right: auto;
    font-size: 12px;
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

  @media (max-width: 1280px) {
    .layout {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-areas:
        'main main'
        'info side';
    }
  }

  @media (max-width: 760px) {
    .intro {
      flex-direction: column;
      align-items: flex-start;
    }

    .layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        'info'
        'main'
        'side';
    }

    .actions {
      flex-wrap: wrap;
    }

    .actions .btn {
      flex: 1;
    }
  }
</style>
