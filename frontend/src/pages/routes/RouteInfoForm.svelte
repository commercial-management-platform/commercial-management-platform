<script lang="ts">
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { DIAS, FRECUENCIAS, planner } from '../../lib/stores/routePlanner.svelte'
  import { fromMinutes } from '../../lib/utils/format'

  let e = $derived(planner.showErrors ? planner.infoErrors : {})

  // Franjas de 30 minutos entre 05:00 y 22:00.
  const HORAS = Array.from({ length: 35 }, (_, i) => fromMinutes(300 + i * 30))
</script>

<section class="card panel" id="route-info" aria-labelledby="route-info-title">
  <h2 id="route-info-title">Información general</h2>

  <label class="field">
    <span>Nombre de la ruta</span>
    <input
      class="input"
      class:invalid={e.nombre}
      value={planner.info.nombre}
      oninput={(ev) => planner.setNombre(ev.currentTarget.value)}
      placeholder="RUT-ZONA-001"
    />
    {#if e.nombre}<small class="error">{e.nombre}</small>{/if}
  </label>

  <label class="field">
    <span>Territorio / zona</span>
    <select
      class="select"
      class:invalid={e.zoneId}
      value={planner.info.zoneId}
      onchange={(ev) => planner.setZone(ev.currentTarget.value ? Number(ev.currentTarget.value) : '')}
    >
      <option value="" disabled>Selecciona una zona</option>
      {#each catalogs.zones as zone (zone.id)}
        <option value={zone.id}>{zone.name}</option>
      {/each}
    </select>
    {#if e.zoneId}<small class="error">{e.zoneId}</small>{/if}
  </label>

  <label class="field">
    <span>Vigente desde</span>
    <input class="input" class:invalid={e.inicio} type="date" bind:value={planner.info.inicio} />
    {#if e.inicio}<small class="error">{e.inicio}</small>{/if}
  </label>

  <fieldset class="field span days">
    <legend>Días de ejecución</legend>
    <div class="day-list" class:invalid={e.dias}>
      {#each DIAS as dia (dia)}
        <label class="day" class:on={planner.info.dias.includes(dia)}>
          <input type="checkbox" checked={planner.info.dias.includes(dia)} onchange={() => planner.toggleDia(dia)} />
          {dia}
        </label>
      {/each}
    </div>
    {#if e.dias}<small class="error">{e.dias}</small>{/if}
  </fieldset>

  <label class="field">
    <span>Frecuencia</span>
    <select class="select" bind:value={planner.info.frecuencia}>
      {#each FRECUENCIAS as f (f)}<option>{f}</option>{/each}
    </select>
  </label>

  <div class="hours">
    <label class="field">
      <span>Hora inicial</span>
      <select class="select" bind:value={planner.info.horaInicio}>
        {#each HORAS as h (h)}<option>{h}</option>{/each}
      </select>
    </label>
    <label class="field">
      <span>Hora final</span>
      <select class="select" class:invalid={e.horaFin} bind:value={planner.info.horaFin}>
        {#each HORAS as h (h)}<option>{h}</option>{/each}
      </select>
    </label>
  </div>
  {#if e.horaFin}<small class="error">{e.horaFin}</small>{/if}

  <label class="field span">
    <span>Descripción</span>
    <textarea
      class="input"
      rows="3"
      bind:value={planner.info.descripcion}
      placeholder="Objetivo o notas de la ruta"
    ></textarea>
  </label>
</section>

<style>
  .panel {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
    padding: 28px;
  }

  .panel > :global(h2),
  .panel > :global(.span),
  .panel > :global(.error) {
    grid-column: 1 / -1;
  }

  .hours {
    grid-column: span 2;
  }

  .days {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .days legend {
    margin-bottom: 8px;
    padding: 0;
    font: 600 13px/18px var(--font-heading);
  }

  .day-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .day {
    display: inline-flex;
    align-items: center;
    height: 40px;
    padding: 0 16px;
    font: 600 14px var(--font-heading);
    border: 1px solid var(--border-default);
    border-radius: 999px;
    cursor: pointer;
    user-select: none;
  }

  .day input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .day:has(input:focus-visible) {
    outline: 2px solid var(--brand-500);
    outline-offset: 2px;
  }

  .day.on {
    color: #fff;
    border-color: var(--brand-700);
    background: var(--brand-700);
  }

  .day-list.invalid .day {
    border-color: var(--danger);
  }

  h2 {
    font-size: 18px;
    line-height: 26px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .field span {
    font: 600 13px/18px var(--font-heading);
  }

  .field :global(.input),
  .field :global(.select) {
    width: 100%;
    height: 44px;
  }

  textarea.input {
    height: auto !important;
    padding: 10px 12px;
    resize: vertical;
  }

  .hours {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .hours {
    gap: 24px;
  }

  .hours .select {
    padding: 0 26px 0 10px;
    background-position: right 8px center;
  }

  .invalid {
    border-color: var(--danger);
  }

  .error {
    margin-top: -16px;
    font-size: 13px;
    color: var(--danger);
  }

  .field .error {
    margin-top: 0;
  }

  @media (max-width: 900px) {
    .panel {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hours {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 560px) {
    .panel {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
