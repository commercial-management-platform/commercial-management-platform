<script lang="ts">
  import AppShell from './layout/AppShell.svelte'
  import { router, type Route } from './lib/router.svelte'
  import { session } from './lib/stores/session.svelte'
  import ComingSoon from './pages/ComingSoon.svelte'
  import Dashboard from './pages/dashboard/Dashboard.svelte'
  import Login from './pages/login/Login.svelte'
  import Clients from './pages/clients/Clients.svelte'
  import Orders from './pages/orders/Orders.svelte'
  import Quotes from './pages/quotes/Quotes.svelte'
  import Visits from './pages/visits/Visits.svelte'
  import Admin from './pages/admin/Admin.svelte'
  import Advisors from './pages/routes/Advisors.svelte'
  import AssignedRoutes from './pages/routes/AssignedRoutes.svelte'
  import CreateRoute from './pages/routes/CreateRoute.svelte'

  import { onMount } from 'svelte'
  import { can } from './lib/permissions.svelte'
  import KestrelLogo from './lib/components/KestrelLogo.svelte'
  import Toasts from './lib/components/Toasts.svelte'

  const pending: Partial<Record<Route, string>> = {}

  // Si hay una sesión guardada, se confirma con el backend antes de mostrar la app.
  onMount(() => session.verify())

  // Una pantalla sin permiso (enlace directo o rol cambiado) redirige al dashboard.
  let allowed = $derived(can.visit(router.route))
  $effect(() => {
    if (session.current && !allowed) router.replace('dashboard')
  })
</script>

{#if session.status === 'checking'}
  <div class="splash" role="status" aria-live="polite">
    <KestrelLogo size={52} showWordmark={false} />
    <p>Verificando tu sesión…</p>
  </div>
{:else if session.current}
  <AppShell>
    {#if !allowed}
      <!-- Redirigiendo: no se monta la pantalla sin permiso. -->
    {:else if router.route === 'dashboard'}
      <Dashboard />
    {:else if router.route === 'rutas/crear'}
      <CreateRoute />
    {:else if router.route === 'rutas/asignadas'}
      <AssignedRoutes />
    {:else if router.route === 'rutas/asesores'}
      <Advisors />
    {:else if router.route === 'clientes'}
      <Clients />
    {:else if router.route === 'visitas'}
      <Visits />
    {:else if router.route === 'cotizaciones'}
      <Quotes />
    {:else if router.route === 'pedidos'}
      <Orders />
    {:else if router.route === 'administracion'}
      <Admin />
    {:else}
      <ComingSoon title={pending[router.route] ?? ''} />
    {/if}
  </AppShell>
{:else}
  <!-- Tras iniciar sesión se queda en la ruta pedida (enlaces directos), o el dashboard por defecto. -->
  <Login onSuccess={(s) => session.signIn(s)} />
{/if}

<!-- Fuera del layout para que los avisos (p. ej. "sesión expirada") se vean también en el login. -->
<Toasts />

<style>
  .splash {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    min-height: 100vh;
    color: var(--text-secondary);
  }

  .splash :global(.mark) {
    animation: breathe 1.4s ease-in-out infinite;
  }

  @keyframes breathe {
    50% {
      transform: scale(0.92);
      opacity: 0.7;
    }
  }
</style>
