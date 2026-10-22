<script lang="ts">
  import AnimatedNumber from '../../lib/components/AnimatedNumber.svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import { ZONAS, planner } from '../../lib/stores/routePlanner.svelte'
  import { formatDuration, fromMinutes } from '../../lib/utils/format'

  let t = $derived(planner.totals)
  let zona = $derived(ZONAS.find((z) => z.value === planner.info.zona)?.label.toLowerCase())

  const km = (meters: number) => `${(meters / 1000).toFixed(1)} km`
</script>

<section class="card summary" aria-labelledby="summary-title">
  <h2 id="summary-title">
    <span class="head-icon"><Icon name="activity" size={16} /></span>
    Resumen de la ruta
  </h2>

  <dl class="metrics">
    <div>
      <dd><AnimatedNumber value={t.paradas} /></dd>
      <dt>Paradas</dt>
    </div>
    <div>
      <dd><AnimatedNumber value={t.distancia} format={km} /></dd>
      <dt>Distancia</dt>
    </div>
    <div>
      <dd><AnimatedNumber value={t.minutos} format={formatDuration} /></dd>
      <dt>Tiempo</dt>
    </div>
  </dl>

  {#if t.paradas > 0}
    <p class="window" class:over={t.exceso > 0}>
      <Icon name="clock" size={14} />
      {#if t.exceso > 0}
        Termina a las {fromMinutes(t.fin)}: se pasa {formatDuration(t.exceso)} de la hora final.
      {:else}
        {planner.info.horaInicio} → {fromMinutes(t.fin)} · dentro del horario
      {/if}
    </p>
  {/if}
</section>

<aside class="note">
  <span class="note-icon"><Icon name="info" size={14} strokeWidth={2.2} /></span>
  <p>
    {#if planner.asesor && planner.info.dia}
      La ruta{zona ? ` de la ${zona}` : ''} será asignada a <strong>{planner.asesor.nombre}</strong> cada
      <strong>{planner.info.dia.toLowerCase()}</strong> ({planner.info.frecuencia.toLowerCase()}), de
      {planner.info.horaInicio} a {planner.info.horaFin}.
    {:else}
      La ruta será asignada al asesor seleccionado para el día y frecuencia configurados.
    {/if}
  </p>
</aside>

<style>
  .summary {
    padding: 24px 20px;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 16px;
    line-height: 22px;
  }

  .head-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    color: #fff;
    border-radius: 50%;
    background: var(--brand-700);
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 18px 0 0;
  }

  .metrics div {
    text-align: center;
  }

  .metrics div + div {
    border-left: 1px solid var(--border-default);
  }

  dd {
    margin: 0;
    font: 800 16px/22px var(--font-heading);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  dt {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .window {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-top: 16px;
    padding: 8px 10px;
    font-size: 13px;
    line-height: 18px;
    color: var(--text-brand);
    border-radius: 8px;
    background: var(--brand-50);
  }

  .window :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .window.over {
    color: #b45309;
    background: #fffbeb;
  }

  .note {
    display: flex;
    gap: 12px;
    padding: 16px;
    font-size: 12px;
    line-height: 17px;
    color: var(--text-brand);
    border: 1px solid var(--brand-100);
    border-radius: 14px;
    background: var(--brand-50);
  }

  .note-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    color: #fff;
    border-radius: 50%;
    background: var(--brand-700);
  }
</style>
