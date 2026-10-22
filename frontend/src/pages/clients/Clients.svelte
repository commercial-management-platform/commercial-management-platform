<script lang="ts">
  import { fade } from 'svelte/transition'
  import AnimatedNumber from '../../lib/components/AnimatedNumber.svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import { MUNICIPIOS, POTENCIALES, SEGMENTOS, clientStatusLabel, isOverdue } from '../../lib/domain/clients'
  import { clientsStore, useLiveClients } from '../../lib/stores/clients.svelte'
  import type { Client, ClientStatus } from '../../lib/types'
  import { downloadCsv } from '../../lib/utils/csv'
  import { formatDate } from '../../lib/utils/format'
  import ClientDrawer from './ClientDrawer.svelte'
  import ClientFormModal from './ClientFormModal.svelte'

  useLiveClients()

  const PAGE_SIZE = 10
  const STATUSES = Object.keys(clientStatusLabel) as ClientStatus[]
  const shortDate = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' })

  type SortKey = 'nombre' | 'ultimaVisita'

  let query = $state('')
  let statuses = $state<ClientStatus[]>([])
  let segmento = $state('')
  let potencial = $state('')
  let municipio = $state('')
  let sort = $state<{ key: SortKey; dir: 1 | -1 }>({ key: 'ultimaVisita', dir: -1 })
  let page = $state(0)
  let filtersOpen = $state(false)
  let filtersEl = $state<HTMLDivElement>()

  // Modales: detalle (por id, para que siga los cambios en vivo) y formulario.
  let detailId = $state<string | null>(null)
  let formOpen = $state(false)
  let editing = $state<Client | null>(null)

  let detail = $derived(detailId ? (clientsStore.byId.get(detailId) ?? null) : null)
  let activeFilters = $derived(statuses.length + (segmento ? 1 : 0) + (potencial ? 1 : 0) + (municipio ? 1 : 0))

  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase()
    const filtered = clientsStore.clients.filter(
      (c) =>
        (statuses.length === 0 || statuses.includes(c.estado)) &&
        (!segmento || c.tipo === segmento) &&
        (!potencial || c.potencial === potencial) &&
        (!municipio || c.municipio === municipio) &&
        (!q || `${c.nombre} ${c.razonSocial} ${c.nit} ${c.contacto.nombre}`.toLowerCase().includes(q)),
    )
    return filtered.toSorted((a, b) => {
      if (sort.key === 'nombre') return a.nombre.localeCompare(b.nombre) * sort.dir
      // Sin visita siempre al final.
      const av = a.ultimaVisita ? Date.parse(a.ultimaVisita) : -Infinity
      const bv = b.ultimaVisita ? Date.parse(b.ultimaVisita) : -Infinity
      return (av - bv) * sort.dir || a.nombre.localeCompare(b.nombre)
    })
  })

  let pages = $derived(Math.max(1, Math.ceil(rows.length / PAGE_SIZE)))
  let visible = $derived(rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE))

  // Al cambiar filtros o búsqueda se vuelve a la primera página.
  $effect(() => {
    void [query, statuses, segmento, potencial, municipio]
    page = 0
  })
  $effect(() => {
    if (page > pages - 1) page = pages - 1
  })

  function toggleSort(key: SortKey) {
    sort = sort.key === key ? { key, dir: sort.dir === 1 ? -1 : 1 } : { key, dir: key === 'nombre' ? 1 : -1 }
  }

  function toggleStatus(status: ClientStatus) {
    statuses = statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
  }

  function clearFilters() {
    statuses = []
    segmento = potencial = municipio = ''
  }

  function openCreate() {
    editing = null
    formOpen = true
  }

  function openEdit(client: Client) {
    editing = client
    formOpen = true
  }

  function exportCsv() {
    downloadCsv(
      `kestrel-clientes-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Nombre comercial', 'Razón social', 'NIT', 'Segmento', 'Potencial', 'Estado', 'Municipio', 'Dirección', 'Contacto', 'Celular', 'Correo', 'Última visita'],
      rows.map((c) => [
        c.nombre,
        c.razonSocial,
        c.nit,
        c.tipo,
        c.potencial,
        clientStatusLabel[c.estado],
        c.municipio,
        c.direccion,
        c.contacto.nombre,
        c.contacto.telefono,
        c.contacto.email,
        c.ultimaVisita ? formatDate(c.ultimaVisita) : '',
      ]),
    )
  }

  const stats = [
    { key: 'total', label: 'Total', prefix: '' },
    { key: 'enProceso', label: 'En proceso', prefix: '' },
    { key: 'esteMes', label: 'Este mes', prefix: '+' },
  ] as const
</script>

<svelte:window onclick={(e) => filtersOpen && !filtersEl?.contains(e.target as Node) && (filtersOpen = false)} />

<div class="page">
  <header class="intro">
    <div>
      <p class="eyebrow">Base comercial</p>
      <h1>Clientes</h1>
      <p class="subtitle">Consulta y administra tu cartera de clientes.</p>
    </div>
    <button class="btn btn-primary" onclick={openCreate}>
      <Icon name="plus" size={16} strokeWidth={2.2} /> Nuevo cliente
    </button>
  </header>

  {#if clientsStore.status === 'ready'}
    <div class="stats">
      {#each stats as stat (stat.key)}
        <article class="card stat" class:flash={clientsStore.highlights[`kpi:${stat.key}`]}>
          <p>{stat.label}</p>
          <strong>
            <AnimatedNumber value={clientsStore.totals[stat.key]} format={(v) => `${stat.prefix}${Math.round(v)}`} />
          </strong>
        </article>
      {/each}
    </div>

    <section class="card list" aria-label="Listado de clientes">
      <header class="list-head">
        <label class="search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Buscar en clientes…" bind:value={query} />
        </label>

        <div class="controls">
          <div class="filters" bind:this={filtersEl}>
            <button class="btn btn-outline" aria-expanded={filtersOpen} onclick={() => (filtersOpen = !filtersOpen)}>
              Filtros
              {#if activeFilters}<span class="count">{activeFilters}</span>{/if}
            </button>
            {#if filtersOpen}
              <div class="popover" transition:fade={{ duration: 120 }}>
                <p class="popover-title">Estado</p>
                {#each STATUSES as status (status)}
                  <label class="check">
                    <input type="checkbox" checked={statuses.includes(status)} onchange={() => toggleStatus(status)} />
                    {clientStatusLabel[status]}
                  </label>
                {/each}
                <p class="popover-title">Segmento</p>
                <select class="select" bind:value={segmento}>
                  <option value="">Todos</option>
                  {#each SEGMENTOS as s (s)}<option>{s}</option>{/each}
                </select>
                <p class="popover-title">Potencial</p>
                <select class="select" bind:value={potencial}>
                  <option value="">Todos</option>
                  {#each POTENCIALES as p (p)}<option>{p}</option>{/each}
                </select>
                <p class="popover-title">Municipio</p>
                <select class="select" bind:value={municipio}>
                  <option value="">Todos</option>
                  {#each MUNICIPIOS as m (m)}<option>{m}</option>{/each}
                </select>
                {#if activeFilters}<button class="clear" onclick={clearFilters}>Limpiar filtros</button>{/if}
              </div>
            {/if}
          </div>
          <button class="btn btn-outline" onclick={exportCsv} disabled={rows.length === 0} title="Exportar a CSV">
            <Icon name="download" size={16} /> Exportar
          </button>
        </div>
      </header>

      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>
                <button class="sort" onclick={() => toggleSort('nombre')}>
                  Cliente
                  {#if sort.key === 'nombre'}<Icon name={sort.dir === 1 ? 'arrow-up' : 'arrow-down'} size={12} />{/if}
                </button>
              </th>
              <th>Contacto</th>
              <th>Segmento</th>
              <th>
                <button class="sort" onclick={() => toggleSort('ultimaVisita')}>
                  Última visita
                  {#if sort.key === 'ultimaVisita'}
                    <Icon name={sort.dir === 1 ? 'arrow-up' : 'arrow-down'} size={12} />
                  {/if}
                </button>
              </th>
              <th>Potencial</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each visible as client (client.id)}
              <tr class:flash={clientsStore.highlights[client.id]}>
                <td class="name">
                  {client.nombre}
                  <small>{client.municipio}</small>
                </td>
                <td>{client.contacto.nombre}</td>
                <td>{client.tipo}</td>
                <td class="date">
                  {#if client.ultimaVisita}
                    {shortDate.format(new Date(client.ultimaVisita)).replace(' de ', ' ').replace('.', '')}
                    {#if client.estado !== 'inactivo' && isOverdue(client.ultimaVisita, client.frecuenciaVisita)}
                      <span class="overdue" title="Pasó su frecuencia de visita de {client.frecuenciaVisita} días">
                        Vencida
                      </span>
                    {/if}
                  {:else}
                    <span class="muted">Sin visitas</span>
                  {/if}
                </td>
                <td>{client.potencial}</td>
                <td><span class="badge {client.estado}">{clientStatusLabel[client.estado]}</span></td>
                <td><button class="link" onclick={() => (detailId = client.id)}>Ver detalle</button></td>
              </tr>
            {:else}
              <tr><td class="empty" colspan="7">No hay clientes que coincidan con la búsqueda.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if rows.length > PAGE_SIZE}
        <footer class="pager">
          <span>
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} de {rows.length}
          </span>
          <div>
            <button class="page-btn" onclick={() => page--} disabled={page === 0} aria-label="Página anterior">
              <Icon name="chevron-left" size={16} />
            </button>
            <span class="page-num">{page + 1} / {pages}</span>
            <button class="page-btn" onclick={() => page++} disabled={page >= pages - 1} aria-label="Página siguiente">
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        </footer>
      {/if}
    </section>
  {:else if clientsStore.status === 'error'}
    <div class="card error">
      <p>No pudimos cargar los clientes.</p>
      <button class="btn btn-outline" onclick={() => clientsStore.connect()}>Reintentar</button>
    </div>
  {:else}
    <div class="stats">
      {#each Array(3) as _, i (i)}<div class="skeleton" style:height="98px"></div>{/each}
    </div>
    <div class="skeleton" style:height="420px"></div>
  {/if}
</div>

<ClientDrawer client={detail} onclose={() => (detailId = null)} onedit={openEdit} />
<ClientFormModal
  open={formOpen}
  client={editing}
  onclose={() => (formOpen = false)}
  onsaved={(c) => {
    if (!editing) detailId = c.id
  }}
/>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    max-width: var(--content-max);
    margin-inline: auto;
  }

  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
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

  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .stat {
    position: relative;
    padding: 20px;
  }

  .stat.flash::after {
    content: '';
    position: absolute;
    inset: -1px;
    border: 2px solid var(--brand-300);
    border-radius: inherit;
    pointer-events: none;
    animation: fade-ring 2.4s ease-out forwards;
  }

  @keyframes fade-ring {
    to {
      opacity: 0;
    }
  }

  .stat p {
    font-size: 12px;
    color: var(--text-muted);
  }

  .stat strong {
    display: block;
    margin-top: 4px;
    font: 800 24px/32px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(280px, 100%);
    height: 42px;
    padding: 0 12px;
    color: var(--text-muted);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .search:focus-within {
    border-color: var(--brand-500);
    box-shadow: var(--ring);
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
  }

  .controls {
    display: flex;
    gap: 8px;
  }

  .filters {
    position: relative;
  }

  .count {
    display: grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 11px;
    color: #fff;
    border-radius: 999px;
    background: var(--brand-600);
  }

  .popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 230px;
    padding: 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.25);
  }

  .popover-title {
    font: 600 11px/16px var(--font-heading);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .check input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--brand-600);
  }

  .popover .select {
    width: 100%;
    height: 38px;
  }

  .clear {
    align-self: flex-start;
    padding: 0;
    font-size: 13px;
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 820px;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    padding: 12px 20px;
    font: 600 11px/16px var(--font-heading);
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--bg-surface-soft);
    border-block: 1px solid var(--border-default);
  }

  .sort {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    color: inherit;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .sort:hover {
    color: var(--text-primary);
  }

  td {
    padding: 14px 20px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-default);
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr:hover {
    background: var(--bg-surface-soft);
  }

  tr.flash {
    animation: live-flash 2.4s ease-out;
  }

  .name {
    font: 700 13px/18px var(--font-heading);
    color: var(--text-primary);
  }

  .name small {
    display: block;
    font: 400 11px/16px var(--font-body);
    color: var(--text-muted);
  }

  .date {
    white-space: nowrap;
  }

  .overdue {
    margin-left: 6px;
    padding: 1px 6px;
    font: 700 10px/14px var(--font-heading);
    color: #b45309;
    border-radius: 999px;
    background: #fffbeb;
  }

  .muted {
    color: var(--text-muted);
  }

  .badge {
    display: inline-block;
    padding: 3px 10px;
    font: 700 11px/16px var(--font-heading);
    white-space: nowrap;
    border-radius: 999px;
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .badge.seguimiento {
    background: var(--brand-100);
  }

  .badge.prospecto {
    color: var(--neutral-700);
    background: var(--neutral-100);
  }

  .badge.inactivo {
    color: var(--text-muted);
    background: transparent;
    border: 1px solid var(--border-default);
  }

  .link {
    padding: 0;
    font: 700 13px/18px var(--font-heading);
    white-space: nowrap;
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .link:hover {
    text-decoration: underline;
  }

  .empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .pager {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    font-size: 12px;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-default);
  }

  .pager div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-btn {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    background: var(--bg-surface);
    cursor: pointer;
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-num {
    min-width: 48px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .skeleton {
    border-radius: 18px;
    background: linear-gradient(90deg, var(--neutral-100) 0%, var(--neutral-50) 50%, var(--neutral-100) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }

  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }

  @media (max-width: 760px) {
    .intro {
      flex-direction: column;
      align-items: flex-start;
    }

    .stats {
      grid-template-columns: 1fr;
    }

    .list-head {
      flex-direction: column;
      align-items: stretch;
    }

    .search {
      width: 100%;
    }
  }
</style>
