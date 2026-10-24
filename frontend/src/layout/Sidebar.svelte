<script lang="ts">
  import AnimatedNumber from "../lib/components/AnimatedNumber.svelte";
  import Icon, { type IconName } from "../lib/components/Icon.svelte";
  import KestrelLogo from "../lib/components/KestrelLogo.svelte";
  import { can } from "../lib/permissions.svelte";
  import { router, type Route } from "../lib/router.svelte";
  import { weeklyGoal } from "../lib/stores/operation.svelte";
  import { session } from "../lib/stores/session.svelte";
  import { percent } from "../lib/utils/format";

  interface Props {
    collapsed: boolean;
    mobileOpen: boolean;
    ontogglecollapse: () => void;
    onnavigate: () => void;
  }

  let { collapsed, mobileOpen, ontogglecollapse, onnavigate }: Props = $props();

  interface NavItem {
    route: Route;
    label: string;
    icon: IconName;
    children?: { route: Route; label: string }[];
    /** Perfil que ve la opción; sin valor, la ven todos. */
    only?: "manager" | "advisor" | "admin";
  }

  const allItems: NavItem[] = [
    { route: "dashboard", label: "Dashboard", icon: "home" },
    {
      route: "rutas/crear",
      label: "Planeación de rutas",
      icon: "activity",
      only: "manager",
      children: [
        { route: "rutas/crear", label: "Creación de rutas" },
        { route: "rutas/asignadas", label: "Rutas asignadas" },
        { route: "rutas/asesores", label: "Asesor asignado" },
      ],
    },
    // El asesor no planea: solo consulta sus rutas, en un enlace directo.
    { route: "rutas/asignadas", label: "Mis rutas", icon: "activity", only: "advisor" },
    { route: "clientes", label: "Clientes", icon: "users" },
    { route: "visitas", label: "Visitas", icon: "map-pin" },
    { route: "seguimientos", label: "Seguimientos", icon: "clock" },
    { route: "cotizaciones", label: "Cotizaciones", icon: "file-text" },
    { route: "pedidos", label: "Pedidos", icon: "package" },
    { route: "administracion", label: "Administración", icon: "user-check", only: "admin" },
  ];

  let items = $derived(
    allItems.filter(
      (item) =>
        !item.only ||
        (item.only === "admin"
          ? can.isAdmin
          : item.only === "manager"
            ? can.isManager
            : can.isAdvisor),
    ),
  );

  const inGroup = (item: NavItem) =>
    !!item.children?.some((c) => c.route === router.route);

  // Grupos desplegados; el del módulo actual se abre solo.
  let openGroups = $state<Record<string, boolean>>({});
  $effect(() => {
    for (const item of items) if (inGroup(item)) openGroups[item.label] = true;
  });

  // En móvil el menú siempre se muestra completo, aunque esté "contraído" en escritorio.
  let iconOnly = $derived(collapsed && !mobileOpen);

  function toggleGroup(item: NavItem) {
    if (iconOnly) {
      router.go(item.route);
      onnavigate();
      return;
    }
    openGroups[item.label] = !openGroups[item.label];
  }

  let user = $derived(session.current?.user);
  let initials = $derived(
    (user?.name ?? "")
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
  );
  weeklyGoal.use();
  let goal = $derived(percent(weeklyGoal.visited, weeklyGoal.scheduled));
</script>

<aside class="sidebar" class:collapsed class:open={mobileOpen}>
  <div class="brand">
    <KestrelLogo size={42} showWordmark={!collapsed} />
    <button
      class="collapse"
      onclick={ontogglecollapse}
      aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
    >
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
          <span class="chev" class:up={open}
            ><Icon name="chevron-down" size={16} /></span
          >
        </button>
        {#if open}
          <ul class="subnav">
            {#each item.children as child (child.route)}
              <li>
                <a
                  href="#/{child.route}"
                  class:active={router.route === child.route}
                  aria-current={router.route === child.route
                    ? "page"
                    : undefined}
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
          aria-current={router.route === item.route ? "page" : undefined}
          title={collapsed ? item.label : undefined}
          onclick={onnavigate}
        >
          <Icon name={item.icon} size={20} />
          <span class="label">{item.label}</span>
        </a>
      {/if}
    {/each}
  </nav>

  <section
    class="goal"
    class:flash={weeklyGoal.highlight}
    aria-label="Objetivo semanal"
  >
    <div
      class="ring"
      role="progressbar"
      aria-valuenow={goal}
      aria-valuemin={0}
      aria-valuemax={100}
      style:--goal="{Math.min(goal, 100)}%"
    >
      <span><AnimatedNumber value={goal} />%</span>
    </div>
    <div class="goal-text">
      <p class="goal-label">Objetivo semanal</p>
      <p class="goal-detail">
        <strong>{weeklyGoal.visited}</strong> de {weeklyGoal.scheduled} visitas
        completadas
      </p>
    </div>
  </section>

  <div class="user">
    <span class="avatar">{initials}</span>
    <div class="user-info">
      <strong>{user?.name}</strong>
      <button class="logout" onclick={() => session.signOut()}
        >Cerrar sesión</button
      >
    </div>
    <button
      class="logout-icon"
      onclick={() => session.signOut()}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
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
    padding: 20px 16px 24px;
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
    gap: 12px;
    height: 48px;
    padding: 0 14px;
    font-size: 0.94rem;
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

  .nav-link .label {
    flex: 1;
    min-width: 0;
  }

  /* Flecha en su propio compartimiento, separada del texto */
  .chev {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 34px;
    height: 28px;
    margin-right: -12px;
  }

  .chev :global(svg) {
    transition: transform 0.2s;
  }

  .chev.up :global(svg) {
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
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: var(--space-4);
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

  /* Anillo de progreso: el relleno sale de --goal */
  .ring {
    position: relative;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 68px;
    height: 68px;
  }

  .ring::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      var(--brand-300) var(--goal),
      rgba(255, 255, 255, 0.18) 0
    );
    -webkit-mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 6px),
      #000 calc(100% - 5px)
    );
    mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 6px),
      #000 calc(100% - 5px)
    );
  }

  .ring span {
    font: 800 1.05rem/1 var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  .goal-text {
    min-width: 0;
  }

  .goal-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--Neutral-100);
  }

  .goal-detail {
    margin-top: 4px;
    font-size: 0.8125rem;
    line-height: 1.35;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.85);
  }

  .goal-detail strong {
    color: #fff;
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
    font-size: 0.8125rem;
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
  .collapsed .chev,
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
