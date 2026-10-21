<script lang="ts">
  import { DIAS, FRECUENCIAS, ZONAS, planner } from '../../lib/stores/routePlanner.svelte'
  import type { Zona } from '../../lib/types'
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
      class:invalid={e.zona}
      value={planner.info.zona}
      onchange={(ev) => planner.setZona(ev.currentTarget.value as Zona)}
    >
      <option value="" disabled>Selecciona una zona</option>
      {#each ZONAS as zona (zona.value)}
        <option value={zona.value}>{zona.label}</option>
      {/each}
    </select>
    {#if e.zona}<small class="error">{e.zona}</small>{/if}
  </label>

  <label class="field">
    <span>Día de ejecución</span>
    <select class="select" class:invalid={e.dia} bind:value={planner.info.dia}>
      <option value="" disabled>Selecciona un día</option>
      {#each DIAS as dia (dia)}<option>{dia}</option>{/each}
    </select>
    {#if e.dia}<small class="error">{e.dia}</small>{/if}
  </label>

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

  <label class="field">
    <span>Descripción</span>
    <textarea
      class="input"
      rows="4"
      bind:value={planner.info.descripcion}
      placeholder="Objetivo o notas de la ruta"
    ></textarea>
  </label>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 20px;
  }

  h2 {
    font-size: 15px;
    line-height: 22px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .field span {
    font: 600 12px/18px var(--font-heading);
  }

  .field :global(.input),
  .field :global(.select) {
    width: 100%;
    height: 40px;
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
    gap: 8px;
  }

  .hours .select {
    padding: 0 26px 0 10px;
    background-position: right 8px center;
  }

  .invalid {
    border-color: var(--danger);
  }

  .error {
    margin-top: -10px;
    font-size: 12px;
    color: var(--danger);
  }

  .field .error {
    margin-top: 0;
  }
</style>
