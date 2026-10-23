<script lang="ts">
  import UsersPanel from './UsersPanel.svelte'
  import ZonesPanel from './ZonesPanel.svelte'

  // Administración (solo admin): usuarios y roles (HU-02) y zonas (HU-05).

  let tab = $state<'users' | 'zones'>('users')
</script>

<div class="page">
  <header>
    <p class="eyebrow">Configuración</p>
    <h1>Administración</h1>
    <p class="subtitle">Cuentas, roles y zonas comerciales de la plataforma.</p>
  </header>

  <div class="tabs" role="tablist" aria-label="Secciones">
    <button role="tab" aria-selected={tab === 'users'} class:active={tab === 'users'} onclick={() => (tab = 'users')}>Usuarios</button>
    <button role="tab" aria-selected={tab === 'zones'} class:active={tab === 'zones'} onclick={() => (tab = 'zones')}>Zonas</button>
  </div>

  {#if tab === 'users'}
    <UsersPanel />
  {:else}
    <ZonesPanel />
  {/if}
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    max-width: var(--content-max);
    margin-inline: auto;
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

  .tabs {
    display: flex;
    align-self: flex-start;
    padding: 3px;
    border: 1px solid var(--border-default);
    border-radius: 10px;
    background: var(--bg-surface);
  }

  .tabs button {
    height: 36px;
    padding: 0 18px;
    font: 600 13px/1 var(--font-heading);
    color: var(--text-secondary);
    border: 0;
    border-radius: 8px;
    background: none;
    cursor: pointer;
  }

  .tabs button.active {
    color: var(--brand-700);
    background: var(--brand-50);
  }
</style>
