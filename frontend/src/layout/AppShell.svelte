<script lang="ts">
  import { onDestroy, onMount, type Snippet } from 'svelte'
  import { dashboard } from '../lib/stores/dashboard.svelte'
  import { ui } from '../lib/stores/ui.svelte'
  import { router } from '../lib/router.svelte'
  import AppFooter from './AppFooter.svelte'
  import RegisterVisitModal from './RegisterVisitModal.svelte'
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

  // La conexión en tiempo real vive mientras el usuario esté dentro de la app.
  onMount(() => dashboard.connect())
  onDestroy(() => dashboard.disconnect())
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
    <Topbar onmenu={() => (mobileOpen = true)} onregister={() => router.go('visitas')} />
    <main class="content">
      {@render children()}
    </main>
    <AppFooter />
  </div>
</div>

<RegisterVisitModal
  open={ui.registerVisit.open}
  presetClientId={ui.registerVisit.clientId}
  onclose={() => ui.closeRegisterVisit()}
/>

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
