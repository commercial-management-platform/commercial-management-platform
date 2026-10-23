<script lang="ts">
  import { flip } from "svelte/animate";
  import { fade } from "svelte/transition";
  import Icon, { type IconName } from "../../lib/components/Icon.svelte";
  import { planner } from "../../lib/stores/routePlanner.svelte";

  const PAGE = 4;

  const tipoIcon: Record<string, IconName> = {
    Industrial: "briefcase",
    Distribuidor: "users",
    Tecnología: "activity",
    Retail: "package",
    Servicios: "file-text",
  };

  let query = $state("");
  let tipo = $state("");
  let municipio = $state("");
  let expanded = $state(false);
  let searchInput: HTMLInputElement;

  /** Lo usa la página para enfocar el buscador desde "Agregar cliente". */
  export function focus() {
    searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    searchInput.focus({ preventScroll: true });
  }

  let tipos = $derived([...new Set(planner.clients.map((c) => c.tipo))].sort());
  let municipios = $derived(
    [...new Set(planner.clients.map((c) => c.municipio))].sort(),
  );

  // Clientes disponibles: sin los ya agregados y con los de la zona elegida primero.
  let results = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const inRoute = new Set(planner.stops.map((s) => s.clientId));
    return planner.clients
      .filter(
        (c) =>
          !inRoute.has(c.id) &&
          (!tipo || c.tipo === tipo) &&
          (!municipio || c.municipio === municipio) &&
          (!q || `${c.nombre} ${c.direccion}`.toLowerCase().includes(q)),
      )
      .sort(
        (a, b) =>
          Number(b.zoneId === planner.info.zoneId) -
          Number(a.zoneId === planner.info.zoneId),
      );
  });

  let visible = $derived(expanded ? results : results.slice(0, PAGE));
</script>

<section class="card picker" id="client-picker" aria-labelledby="picker-title">
  <h2 id="picker-title">Buscar y agregar clientes</h2>
  <p class="sub">Completa las paradas de esta ruta</p>

  <label class="search">
    <Icon name="search" size={16} />
    <input
      bind:this={searchInput}
      type="search"
      placeholder="Buscar cliente…"
      bind:value={query}
    />
  </label>

  <div class="filters">
    <select class="select" bind:value={tipo} aria-label="Tipo de cliente">
      <option value="">Todos los tipos</option>
      {#each tipos as t (t)}<option>{t}</option>{/each}
    </select>
    <select class="select" bind:value={municipio} aria-label="Municipio">
      <option value="">Municipio</option>
      {#each municipios as m (m)}<option>{m}</option>{/each}
    </select>
  </div>

  <ul class="results">
    {#each visible as client (client.id)}
      <li animate:flip={{ duration: 250 }} out:fade={{ duration: 150 }}>
        <span class="icon"
          ><Icon name={tipoIcon[client.tipo] ?? "briefcase"} size={16} /></span
        >
        <span class="info">
          <strong>{client.nombre}</strong>
          <p class="sub">
            {client.tipo} · {client.municipio}
            {#if planner.info.zoneId !== '' && client.zoneId === planner.info.zoneId}<em
                >En zona</em
              >{/if}
          </p>
        </span>
        <button
          class="add"
          onclick={() => planner.addStop(client.id)}
          aria-label="Agregar {client.nombre} a la ruta"
        >
          <Icon name="plus" size={16} strokeWidth={2.2} />
        </button>
      </li>
    {:else}
      <li class="empty">No hay clientes que coincidan.</li>
    {/each}
  </ul>

  {#if results.length > PAGE}
    <button class="more" onclick={() => (expanded = !expanded)}>
      {expanded ? "Ver menos" : `Ver más clientes (${results.length - PAGE})`}
    </button>
  {/if}
</section>

<style>
  .picker {
    padding: 24px 20px;
  }

  h2 {
    font-size: 16px;
    line-height: 22px;
  }

  .sub {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    margin-top: 16px;
    padding: 0 12px;
    color: var(--text-muted);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .search:focus-within {
    border-color: var(--brand-500);
    box-shadow: var(--ring);
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
  }

  .filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
  }

  .filters .select {
    min-width: 0;
    height: 36px;
    padding: 0 22px 0 8px;
    font-size: 12px;
    background-position: right 6px center;
    background-size: 14px;
  }

  .results {
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-default);
  }

  li:last-child {
    border-bottom: 0;
  }

  .icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: var(--brand-600);
    background: var(--brand-50);
  }

  .info {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    line-height: 1.35;
  }

  .info strong {
    font: 700 13px/18px var(--font-heading);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  small {
    font-size: 12px;
    color: var(--text-muted);
  }

  em {
    display: inline-block;
    white-space: nowrap;
    margin-left: 4px;
    padding: 0 6px;
    font-style: normal;
    font-weight: 600;
    color: var(--text-brand);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .add {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    color: var(--brand-600);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    background: var(--bg-surface);
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }

  .add:hover {
    border-color: var(--border-brand);
    background: var(--brand-50);
  }

  .empty {
    justify-content: center;
    padding: 20px 0;
    font-size: 13px;
    color: var(--text-muted);
  }

  .more {
    display: block;
    width: 100%;
    margin-top: 10px;
    padding: 8px;
    font-size: 16px;
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .more:hover {
    text-decoration: underline;
  }
</style>
