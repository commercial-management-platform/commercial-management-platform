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
  import RegisterVisit from './pages/visits/RegisterVisit.svelte'
  import Advisors from './pages/routes/Advisors.svelte'
  import AssignedRoutes from './pages/routes/AssignedRoutes.svelte'
  import CreateRoute from './pages/routes/CreateRoute.svelte'

  const pending: Partial<Record<Route, string>> = {}
</script>

{#if session.current}
  <AppShell>
    {#if router.route === 'dashboard'}
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
      <RegisterVisit />
    {:else if router.route === 'cotizaciones'}
      <Quotes />
    {:else if router.route === 'pedidos'}
      <Orders />
    {:else}
      <ComingSoon title={pending[router.route] ?? ''} />
    {/if}
  </AppShell>
{:else}
  <!-- Tras iniciar sesión se queda en la ruta pedida (enlaces directos), o el dashboard por defecto. -->
  <Login onSuccess={(s) => session.signIn(s)} />
{/if}
