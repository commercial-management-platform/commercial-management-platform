<script lang="ts">
  import { onMount } from 'svelte'
  import KestrelLogo from '../lib/components/KestrelLogo.svelte'
  import type { Route } from '../lib/router.svelte'
  import { getHealth } from '../lib/services/healthApi'

  const HEALTH_POLL_MS = 60_000

  const links: { route: Route; label: string }[] = [
    { route: 'dashboard', label: 'Dashboard' },
    { route: 'clientes', label: 'Clientes' },
    { route: 'visitas', label: 'Visitas' },
    { route: 'seguimientos', label: 'Seguimientos' },
    { route: 'cotizaciones', label: 'Cotizaciones' },
    { route: 'pedidos', label: 'Pedidos' },
  ]

  const year = new Date().getFullYear()

  /** checking → al abrir; online / degraded (API arriba, BD caída) / offline. */
  let api = $state<'checking' | 'online' | 'degraded' | 'offline'>('checking')

  const apiLabel = {
    checking: 'Verificando servidor…',
    online: 'Servidor conectado',
    degraded: 'Base de datos sin conexión',
    offline: 'Sin conexión con el servidor',
  }

  async function check() {
    try {
      const health = await getHealth()
      api = health.status === 'ok' && health.database === 'up' ? 'online' : 'degraded'
    } catch {
      api = 'offline'
    }
  }

  onMount(() => {
    check()
    const timer = setInterval(check, HEALTH_POLL_MS)
    return () => clearInterval(timer)
  })
</script>

<footer class="footer">
  <div class="top">
    <div class="brand">
      <KestrelLogo size={28} />
      <p>Planea rutas, registra visitas y cierra más negocios con información clara y actualizada.</p>
    </div>

    <nav aria-label="Enlaces del pie de página">
      {#each links as link (link.route)}
        <a href="#/{link.route}">{link.label}</a>
      {/each}
    </nav>
  </div>

  <div class="bottom">
    <p>© {year} Kestrel. Gestión simple, resultados sólidos.</p>
    <p class="status {api}" role="status" title="Estado del backend (GET /api/health)">
      <span class="dot"></span>{apiLabel[api]}
    </p>
  </div>
</footer>

<style>
  .footer {
    margin-top: auto;
    padding: 28px 60px 24px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-default);
  }

  .top,
  .bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    width: 100%;
    max-width: var(--content-max);
    margin-inline: auto;
  }

  .brand {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 360px;
  }

  .brand p {
    font-size: 12px;
    line-height: 18px;
    color: var(--text-secondary);
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
  }

  nav a {
    font: 600 13px/20px var(--font-heading);
    color: var(--text-secondary);
    text-decoration: none;
  }

  nav a:hover {
    color: var(--text-brand);
  }

  .bottom {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border-default);
    font-size: 12px;
    color: var(--text-muted);
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
  }

  .online .dot {
    background: var(--brand-500);
    box-shadow: 0 0 0 3px var(--brand-100);
  }

  .degraded .dot {
    background: #f59e0b;
    box-shadow: 0 0 0 3px #fef3c7;
  }

  .offline .dot {
    background: var(--danger);
    box-shadow: 0 0 0 3px var(--danger-bg);
  }

  @media (max-width: 1280px) {
    .footer {
      padding: 24px 32px 20px;
    }
  }

  @media (max-width: 760px) {
    .footer {
      padding: 24px 16px 20px;
    }

    .top,
    .bottom {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
