<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import { createZone, listCatalog, renameZone, setZoneActive, type CatalogEntry } from '../../lib/services/catalogsApi'
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'

  // Zonas (HU-05): el único catálogo editable, solo por el admin. Desactivar una
  // zona no la borra: deja de ofrecerse en clientes y rutas nuevos.

  let status = $state<'loading' | 'ready' | 'error'>('loading')
  let error = $state('')
  let zones = $state<CatalogEntry[]>([])
  let newName = $state('')
  let editingId = $state<number | null>(null)
  let editName = $state('')
  let busy = $state(false)

  let rows = $derived(zones.toSorted((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)))

  async function load() {
    try {
      zones = await listCatalog('zones', true)
      status = 'ready'
    } catch (e) {
      error = errorText(e, 'No pudimos cargar las zonas.')
      status = 'error'
    }
  }
  load()

  /** Ejecuta el cambio, recarga la lista y refresca los selects de zona del resto de la app. */
  async function run(action: () => Promise<unknown>, title: string, message: string) {
    busy = true
    try {
      await action()
      await load()
      catalogs.invalidate()
      toasts.push({ tone: 'success', icon: 'map-pin', title, message })
      return true
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo guardar la zona', message: errorText(e, 'Intenta de nuevo.') })
      return false
    } finally {
      busy = false
    }
  }

  async function add(event: SubmitEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (await run(() => createZone(name), 'Zona creada', name)) newName = ''
  }

  async function saveEdit(zone: CatalogEntry) {
    const name = editName.trim()
    if (!name || name === zone.name) return void (editingId = null)
    if (await run(() => renameZone(zone.id, name), 'Zona renombrada', name)) editingId = null
  }

  function toggle(zone: CatalogEntry) {
    run(() => setZoneActive(zone.id, !zone.active), zone.active ? 'Zona desactivada' : 'Zona reactivada', zone.name)
  }
</script>

<section class="card list" aria-label="Zonas">
  <form class="list-head" onsubmit={add}>
    <input class="input" placeholder="Nombre de la nueva zona" maxlength="100" bind:value={newName} aria-label="Nueva zona" />
    <button class="btn btn-primary" type="submit" disabled={busy || !newName.trim()}>
      <Icon name="plus" size={16} strokeWidth={2.2} /> Agregar zona
    </button>
  </form>

  {#if status === 'error'}
    <div class="error">
      <p>{error}</p>
      <button class="btn btn-outline" onclick={load}>Reintentar</button>
    </div>
  {:else if status === 'loading'}
    <p class="empty">Cargando zonas…</p>
  {:else}
    <ul>
      {#each rows as zone (zone.id)}
        <li class:off={!zone.active}>
          {#if editingId === zone.id}
            <input
              class="input"
              maxlength="100"
              bind:value={editName}
              aria-label="Nuevo nombre"
              onkeydown={(e) => {
                if (e.key === 'Enter') saveEdit(zone)
                if (e.key === 'Escape') editingId = null
              }}
            />
            <div class="actions">
              <button class="link" onclick={() => saveEdit(zone)} disabled={busy}>Guardar</button>
              <button class="link muted" onclick={() => (editingId = null)}>Cancelar</button>
            </div>
          {:else}
            <p class="name">
              {zone.name}
              {#if !zone.active}<span class="tag">Desactivada</span>{/if}
            </p>
            <div class="actions">
              <button
                class="link"
                onclick={() => {
                  editingId = zone.id
                  editName = zone.name
                }}>Renombrar</button
              >
              <button class="link" class:danger={zone.active} onclick={() => toggle(zone)} disabled={busy}>
                {zone.active ? 'Desactivar' : 'Reactivar'}
              </button>
            </div>
          {/if}
        </li>
      {:else}
        <li class="empty">Aún no hay zonas.</li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .list-head {
    display: flex;
    gap: 8px;
    padding: 20px;
    border-bottom: 1px solid var(--border-default);
  }

  .list-head .input {
    flex: 1;
    max-width: 360px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 56px;
    padding: 8px 20px;
    border-bottom: 1px solid var(--border-default);
  }

  li:last-child {
    border-bottom: 0;
  }

  li.off .name {
    opacity: 0.6;
  }

  li .input {
    flex: 1;
    max-width: 360px;
    height: 38px;
  }

  .name {
    font: 700 14px/20px var(--font-heading);
  }

  .tag {
    margin-left: 8px;
    padding: 1px 8px;
    font: 600 10px/14px var(--font-heading);
    color: var(--text-muted);
    border: 1px solid var(--border-default);
    border-radius: 999px;
  }

  .actions {
    display: flex;
    gap: 12px;
    white-space: nowrap;
  }

  .link {
    padding: 0;
    font: 700 13px/18px var(--font-heading);
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .link.danger {
    color: var(--danger);
  }

  .link.muted {
    color: var(--text-muted);
  }

  .link:hover:not(:disabled) {
    text-decoration: underline;
  }

  .empty {
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  @media (max-width: 640px) {
    .list-head,
    li {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
