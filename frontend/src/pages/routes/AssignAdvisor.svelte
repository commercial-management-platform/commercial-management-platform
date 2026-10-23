<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import { planner } from '../../lib/stores/routePlanner.svelte'

  let missing = $derived(planner.showErrors && planner.advisorId === '')
</script>

<section class="card assign" id="route-assign" aria-labelledby="assign-title">
  <h2 id="assign-title">
    <span class="head-icon"><Icon name="user-check" size={16} /></span>
    Asignar ruta a asesor
  </h2>

  <label class="field">
    <span>Asesor comercial</span>
    <select id="asesor-select" class="select" class:invalid={missing} bind:value={planner.advisorId}>
      <option value="" disabled>Selecciona un asesor</option>
      {#each planner.advisors as advisor (advisor.id)}
        <option value={advisor.id}>{advisor.name}</option>
      {/each}
    </select>
  </label>

  {#if planner.advisor}
    <p class="load">
      {planner.advisor.rutasActivas} rutas activas · esta sería la {planner.advisor.rutasActivas + 1}.ª
    </p>
  {:else if !planner.advisors.length}
    <p class="error">No hay asesores activos. Crea uno en Administración.</p>
  {:else if missing}
    <p class="error">Selecciona el asesor responsable.</p>
  {/if}
</section>

<style>
  .assign {
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 18px;
  }

  .field span {
    font: 600 13px/18px var(--font-heading);
  }

  .select {
    width: 100%;
  }

  .invalid {
    border-color: var(--danger);
  }

  .load {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .error {
    margin-top: 8px;
    font-size: 13px;
    color: var(--danger);
  }
</style>
