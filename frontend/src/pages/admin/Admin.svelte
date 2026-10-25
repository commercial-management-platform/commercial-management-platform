<script lang="ts">
  import { can } from '../../lib/permissions.svelte'
  import UsersPanel from './UsersPanel.svelte'
  import ZonesPanel from './ZonesPanel.svelte'

  // Administración: el admin gestiona usuarios y roles (HU-02) y zonas (HU-05);
  // el director solo las cuentas de los asesores (HU-02 CA-13).

  let tab = $state<'users' | 'zones'>('users')
</script>

<div class="page">
  <header>
    <p class="eyebrow">Configuración</p>
    <h1>Administración</h1>
    <p class="subtitle">
      {can.manageZones ? 'Cuentas, roles y zonas comerciales de la plataforma.' : 'Cuentas de los asesores comerciales.'}
    </p>
  </header>

  {#if can.manageZones}
    <div class="tabs" role="tablist" aria-label="Secciones">
      <button role="tab" aria-selected={tab === 'users'} class:active={tab === 'users'} onclick={() => (tab = 'users')}>Usuarios</button>
      <button role="tab" aria-selected={tab === 'zones'} class:active={tab === 'zones'} onclick={() => (tab = 'zones')}>Zonas</button>
    </div>
  {/if}

  {#if tab === 'users' || !can.manageZones}
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
