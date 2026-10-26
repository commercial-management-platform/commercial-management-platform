<script lang="ts">
  import type { Snippet } from 'svelte'
  import { router } from '../lib/router.svelte'
  import { can } from '../lib/permissions.svelte'
  import AppFooter from './AppFooter.svelte'
  import Sidebar from './Sidebar.svelte'
  import Topbar from './Topbar.svelte'

  let { children }: { children: Snippet } = $props()

  const COLLAPSE_KEY = 'kestrel.sidebar.collapsed'

  function readCollapsed() {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  }

  let collapsed = $state(readCollapsed())
  let mobileOpen = $state(false)

  function toggleCollapse() {
    collapsed = !collapsed
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* almacenamiento no disponible */
    }
  }
</script>

<div class="shell">
  <Sidebar
    {collapsed}
    {mobileOpen}
    ontogglecollapse={toggleCollapse}
    onnavigate={() => (mobileOpen = false)}
  />

  {#if mobileOpen}
    <button class="scrim" aria-label="Cerrar menú" onclick={() => (mobileOpen = false)}></button>
  {/if}

  <div class="main">
    <Topbar onmenu={() => (mobileOpen = true)} onregister={() => router.go('visitas', can.isAdvisor ? undefined : { nueva: '1' })} />
    <main class="content">
      {@render children()}
    </main>
    <AppFooter />
  </div>
</div>

<style>
  .shell {
    display: flex;
    min-height: 100vh;
  }

  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 100vh;
  }

  .content {
    padding: 40px 60px 64px;
  }

  .scrim {
    position: fixed;
    inset: 0;
    z-index: 40;
    border: 0;
    background: rgba(7, 61, 49, 0.4);
  }

  @media (max-width: 1280px) {
    .content {
      padding: 32px 32px 56px;
    }
  }

  @media (max-width: 760px) {
    .content {
      padding: 24px 16px 48px;
    }
  }
</style>
