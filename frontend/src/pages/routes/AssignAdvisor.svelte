<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import { planner } from '../../lib/stores/routePlanner.svelte'

  let missing = $derived(planner.showErrors && !planner.asesorId)
</script>

<section class="card assign" id="route-assign" aria-labelledby="assign-title">
  <h2 id="assign-title">
    <span class="head-icon"><Icon name="user-check" size={16} /></span>
    Asignar ruta a asesor
  </h2>

  <label class="field">
    <span>Asesor comercial</span>
    <select id="asesor-select" class="select" class:invalid={missing} bind:value={planner.asesorId}>
      <option value="" disabled>Selecciona un asesor</option>
      {#each planner.asesores as asesor (asesor.id)}
        <option value={asesor.id}>{asesor.nombre}</option>
      {/each}
    </select>
  </label>

  {#if planner.asesor}
    <p class="load">
      {planner.asesor.rutasActivas} rutas activas · esta sería la {planner.asesor.rutasActivas + 1}.ª
    </p>
  {:else if missing}
    <p class="error">Selecciona el asesor responsable.</p>
  {/if}
</section>

<style>
  .assign {
    padding: 20px 16px;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 18px;
  }

  .field span {
    font: 600 12px/18px var(--font-heading);
  }

  .select {
    width: 100%;
  }

  .invalid {
    border-color: var(--danger);
  }

  .load {
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .error {
    margin-top: 8px;
    font-size: 12px;
    color: var(--danger);
  }
</style>
