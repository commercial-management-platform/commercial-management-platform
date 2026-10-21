<script lang="ts">
  import AnimatedNumber from '../lib/components/AnimatedNumber.svelte'
  import Icon, { type IconName } from '../lib/components/Icon.svelte'
  import KestrelLogo from '../lib/components/KestrelLogo.svelte'
  import { router, type Route } from '../lib/router.svelte'
  import { dashboard } from '../lib/stores/dashboard.svelte'
  import { session } from '../lib/stores/session.svelte'
  import { percent } from '../lib/utils/format'

  interface Props {
    collapsed: boolean
    mobileOpen: boolean
    ontogglecollapse: () => void
    onnavigate: () => void
  }

  let { collapsed, mobileOpen, ontogglecollapse, onnavigate }: Props = $props()

  interface NavItem {
    route: Route
    label: string
    icon: IconName
    children?: { route: Route; label: string }[]
  }

  const items: NavItem[] = [
    { route: 'dashboard', label: 'Dashboard', icon: 'home' },
    {
      route: 'rutas/crear',
      label: 'Planeación de rutas',
      icon: 'activity',
      children: [
        { route: 'rutas/crear', label: 'Creación de rutas' },
        { route: 'rutas/asignadas', label: 'Rutas asignadas' },
        { route: 'rutas/asesores', label: 'Asesor asignado' },
      ],
    },
    { route: 'clientes', label: 'Clientes', icon: 'users' },
    { route: 'visitas', label: 'Visitas', icon: 'map-pin' },
    { route: 'cotizaciones', label: 'Cotizaciones', icon: 'file-text' },
    { route: 'pedidos', label: 'Pedidos', icon: 'package' },
  ]

  const inGroup = (item: NavItem) => !!item.children?.some((c) => c.route === router.route)

  // Grupos desplegados; el del módulo actual se abre solo.
  let openGroups = $state<Record<string, boolean>>({})
  $effect(() => {
    for (const item of items) if (inGroup(item)) openGroups[item.label] = true
  })

  // En móvil el menú siempre se muestra completo, aunque esté "contraído" en escritorio.
  let iconOnly = $derived(collapsed && !mobileOpen)

  function toggleGroup(item: NavItem) {
    if (iconOnly) {
      router.go(item.route)
      onnavigate()
      return
    }
    openGroups[item.label] = !openGroups[item.label]
  }

  let user = $derived(session.current?.user)
  let initials = $derived(
    (user?.name ?? '')
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
  )
  let goal = $derived(percent(dashboard.weekly.visitasRealizadas, dashboard.weekly.metaVisitas))
</script>

<aside class="sidebar" class:collapsed class:open={mobileOpen}>
  <div class="brand">
    <KestrelLogo size={42} showWordmark={!collapsed} />
    <button class="collapse" onclick={ontogglecollapse} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>
      <Icon name="chevron-left" size={16} />
    </button>
  </div>

  <nav>
    {#each items as item (item.label)}
      {#if item.children}
        {@const open = openGroups[item.label] && !iconOnly}
        <button
          class="nav-link"
          class:active={inGroup(item)}
          aria-expanded={open}
          title={collapsed ? item.label : undefined}
          onclick={() => toggleGroup(item)}
        >
          <Icon name={item.icon} size={20} />
          <span class="label">{item.label}</span>
          <Icon name="chevron-down" size={16} class="sub {open ? 'up' : ''}" />
        </button>
        {#if open}
          <ul class="subnav">
            {#each item.children as child (child.route)}
              <li>
                <a
                  href="#/{child.route}"
                  class:active={router.route === child.route}
                  aria-current={router.route === child.route ? 'page' : undefined}
                  onclick={onnavigate}
                >
                  <span class="bullet"></span>{child.label}
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      {:else}
        <a
          href="#/{item.route}"
          class="nav-link"
          class:active={router.route === item.route}
          aria-current={router.route === item.route ? 'page' : undefined}
          title={collapsed ? item.label : undefined}
          onclick={onnavigate}
        >
          <Icon name={item.icon} size={20} />
          <span class="label">{item.label}</span>
        </a>
      {/if}
    {/each}
  </nav>

  <section class="goal" class:flash={dashboard.highlights['kpi:visitasRealizadas']} aria-label="Objetivo semanal">
    <span class="goal-icon"><Icon name="trending-up" size={16} /></span>
    <p class="goal-label">Objetivo semanal</p>
    <p class="goal-value"><AnimatedNumber value={goal} />%</p>
    <div class="bar" role="progressbar" aria-valuenow={goal} aria-valuemin={0} aria-valuemax={100}>
      <span style:width="{Math.min(goal, 100)}%"></span>
    </div>
    <p class="goal-detail">
      {dashboard.weekly.visitasRealizadas} de {dashboard.weekly.metaVisitas} visitas completadas
    </p>
  </section>

  <div class="user">
    <span class="avatar">{initials}</span>
    <div class="user-info">
      <strong>{user?.name}</strong>
      <button class="logout" onclick={() => session.signOut()}>Cerrar sesión</button>
    </div>
    <button class="logout-icon" onclick={() => session.signOut()} aria-label="Cerrar sesión" title="Cerrar sesión">
      <Icon name="log-out" size={18} />
    </button>
  </div>
</aside>

<style>
  .sidebar {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    width: 260px;
    height: 100vh;
    height: 100dvh;
    padding: 20px 20px 24px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
    transition: width 0.2s ease;
    overflow: hidden auto;
  }

  .brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 52px;
  }

  .collapse {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    padding: 0;
    border: 1px solid var(--border-default);
    border-radius: 8px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: transform 0.2s;
  }

  .collapse:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 32px;
  }

  .nav-link {
    width: 100%;
    border: 0;
    background: transparent;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 14px;
    height: 48px;
    padding: 0 14px;
    font-size: 0.98rem;
    color: var(--text-secondary);
    border-radius: 12px;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .nav-link:hover {
    color: var(--text-primary);
    background: var(--bg-page);
  }

  .nav-link.active {
    font-weight: 600;
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .nav-link :global(svg) {
    flex-shrink: 0;
  }

  .nav-link :global(.sub) {
    margin-left: auto;
    transition: transform 0.2s;
  }

  .nav-link :global(.sub.up) {
    transform: rotate(180deg);
  }

  .subnav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 4px 0 6px;
    padding: 0 0 0 30px;
    list-style: none;
  }

  .subnav a {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 12px;
    font-size: 15px;
    color: var(--text-secondary);
    border-radius: 10px;
    text-decoration: none;
  }

  .subnav a:hover {
    color: var(--text-primary);
    background: var(--bg-page);
  }

  .subnav a.active {
    color: var(--text-brand);
    background: var(--brand-50);
  }

  .bullet {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-muted);
  }

  .subnav a.active .bullet {
    background: var(--brand-500);
  }

  .goal {
    position: relative;
    margin-top: 36px;
    padding: 16px;
    color: #fff;
    border-radius: 16px;
    background: var(--gradient-goal);
  }

  .goal.flash {
    animation: pulse 1.2s ease-out;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(110, 231, 183, 0.6);
    }
    100% {
      box-shadow: 0 0 0 14px rgba(110, 231, 183, 0);
    }
  }

  .goal-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.12);
    color: var(--brand-300);
  }

  .goal-label {
    margin-top: 18px;
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .goal-value {
    font-family: var(--font-heading);
    margin-top: 6px;
    font-size: 1.6rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .bar {
    height: 6px;
    margin-top: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--brand-300);
    transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .goal-detail {
    margin-top: 10px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .user {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: auto;
    padding-top: 20px;
    border-top: 1px solid var(--border-default);
  }

  .avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--brand-700);
    border-radius: 50%;
    background: var(--brand-100);
  }

  .user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.3;
  }

  .user-info strong {
    font-size: 0.92rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logout {
    padding: 0;
    border: 0;
    background: none;
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: left;
    cursor: pointer;
  }

  .logout:hover {
    color: var(--danger);
  }

  .logout-icon {
    display: none;
  }

  /* --- Contraído (solo iconos) --- */
  .collapsed {
    width: 88px;
    padding-inline: 16px;
  }

  .collapsed .brand {
    flex-direction: column;
    gap: 14px;
  }

  .collapsed .collapse {
    transform: rotate(180deg);
  }

  .collapsed .nav-link {
    justify-content: center;
    padding: 0;
  }

  .collapsed .label,
  .collapsed .nav-link :global(.sub),
  .collapsed .goal,
  .collapsed .user-info {
    display: none;
  }

  .collapsed .user {
    flex-direction: column;
  }

  .collapsed .logout-icon {
    display: grid;
    place-items: center;
    padding: 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  /* --- Móvil: menú lateral deslizable --- */
  @media (max-width: 1024px) {
    .sidebar,
    .sidebar.collapsed {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 50;
      width: 280px;
      padding-inline: 20px;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      box-shadow: 0 0 40px rgba(15, 23, 42, 0.2);
    }

    .sidebar.open {
      transform: none;
    }

    .collapse {
      display: none;
    }

    .collapsed .label,
    .collapsed .goal,
    .collapsed .user-info {
      display: revert;
    }

    .collapsed .brand {
      flex-direction: row;
    }

    .collapsed .nav-link {
      justify-content: flex-start;
      padding: 0 14px;
    }
  }
</style>
