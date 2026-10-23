<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import { roleLabel, type UserRole } from '../../lib/services/auth'
  import { changeUserRole, listUsers, setUserActive, type ApiUser } from '../../lib/services/usersApi'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'
  import { session } from '../../lib/stores/session.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatDate } from '../../lib/utils/format'
  import UserFormModal from './UserFormModal.svelte'

  // Gestión de usuarios (HU-02): crear, editar nombre, cambiar rol y activar o desactivar.
  // El backend impide dejar la plataforma sin administradores activos (409).

  const ROLES = Object.keys(roleLabel) as UserRole[]

  let status = $state<'loading' | 'ready' | 'error'>('loading')
  let error = $state('')
  let users = $state<ApiUser[]>([])
  let query = $state('')
  let roleFilter = $state<UserRole | ''>('')
  let busyId = $state<string | null>(null)
  let formOpen = $state(false)
  let editing = $state<ApiUser | null>(null)

  let rows = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return users
      .filter((u) => (!roleFilter || u.role === roleFilter) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)))
      .toSorted((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name))
  })

  async function load() {
    try {
      users = await listUsers()
      status = 'ready'
    } catch (e) {
      error = errorText(e, 'No pudimos cargar los usuarios.')
      status = 'error'
    }
  }
  load()

  function upsert(user: ApiUser) {
    const index = users.findIndex((u) => u.id === user.id)
    if (index === -1) users = [user, ...users]
    else users[index] = user
  }

  async function run(user: ApiUser, action: () => Promise<ApiUser>, title: string) {
    busyId = user.id
    try {
      upsert(await action())
      toasts.push({ tone: 'success', icon: 'user-check', title, message: user.name })
      return true
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo completar', message: errorText(e, 'Intenta de nuevo.') })
      return false
    } finally {
      busyId = null
    }
  }

  async function changeRole(user: ApiUser, select: HTMLSelectElement) {
    const role = select.value as UserRole
    if (role === user.role) return
    // Si el backend lo rechaza (p. ej. el último admin), el select vuelve al rol real.
    if (!(await run(user, () => changeUserRole(user.id, role), `Rol cambiado a ${roleLabel[role]}`))) select.value = user.role
  }

  function toggle(user: ApiUser) {
    if (user.isActive && !confirm(`¿Desactivar la cuenta de ${user.name}? No podrá iniciar sesión; su historial se conserva.`)) return
    run(user, () => setUserActive(user.id, !user.isActive), user.isActive ? 'Usuario desactivado' : 'Usuario reactivado')
  }
</script>

<section class="card list" aria-label="Usuarios">
  <header class="list-head">
    <label class="search">
      <Icon name="search" size={16} />
      <input type="search" placeholder="Buscar por nombre o correo…" bind:value={query} />
    </label>
    <div class="controls">
      <select class="select" bind:value={roleFilter} aria-label="Rol">
        <option value="">Todos los roles</option>
        {#each ROLES as r (r)}<option value={r}>{roleLabel[r]}</option>{/each}
      </select>
      <button
        class="btn btn-primary"
        onclick={() => {
          editing = null
          formOpen = true
        }}
      >
        <Icon name="plus" size={16} strokeWidth={2.2} /> Nuevo usuario
      </button>
    </div>
  </header>

  {#if status === 'error'}
    <div class="error">
      <p>{error}</p>
      <button class="btn btn-outline" onclick={load}>Reintentar</button>
    </div>
  {:else if status === 'loading'}
    <p class="empty">Cargando usuarios…</p>
  {:else}
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as user (user.id)}
            {@const self = user.id === session.current?.user.id}
            <tr class:off={!user.isActive}>
              <td class="name">
                {user.name}
                {#if self}<span class="tag">Tú</span>{/if}
                <small>{user.email}</small>
              </td>
              <td>
                <select
                  class="select role"
                  value={user.role}
                  disabled={busyId === user.id || self}
                  title={self ? 'No puedes cambiar tu propio rol' : undefined}
                  onchange={(e) => changeRole(user, e.currentTarget)}
                  aria-label="Rol de {user.name}"
                >
                  {#each ROLES as r (r)}<option value={r}>{roleLabel[r]}</option>{/each}
                </select>
              </td>
              <td><span class="badge" class:inactive={!user.isActive}>{user.isActive ? 'Activo' : 'Desactivado'}</span></td>
              <td class="date">{formatDate(user.createdAt)}</td>
              <td class="actions">
                <button
                  class="link"
                  onclick={() => {
                    editing = user
                    formOpen = true
                  }}>Editar</button
                >
                {#if !self}
                  <button class="link" class:danger={user.isActive} onclick={() => toggle(user)} disabled={busyId === user.id}>
                    {user.isActive ? 'Desactivar' : 'Reactivar'}
                  </button>
                {/if}
              </td>
            </tr>
          {:else}
            <tr><td class="empty" colspan="5">No hay usuarios que coincidan.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<UserFormModal
  open={formOpen}
  user={editing}
  onclose={() => (formOpen = false)}
  onsaved={(user) => {
    upsert(user)
    toasts.push({ tone: 'success', icon: 'user-check', title: editing ? 'Usuario actualizado' : 'Usuario creado', message: user.name })
  }}
/>

<style>
  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
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
    flex-wrap: wrap;
  }

  .scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 760px;
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

  td {
    padding: 12px 20px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-default);
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tr.off td {
    opacity: 0.6;
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

  .tag {
    margin-left: 6px;
    padding: 1px 8px;
    font-size: 10px;
    color: var(--brand-700);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .role {
    height: 36px;
    min-width: 180px;
  }

  .badge {
    display: inline-block;
    padding: 3px 10px;
    font: 700 11px/16px var(--font-heading);
    border-radius: 999px;
    color: var(--brand-700);
    background: var(--brand-100);
  }

  .badge.inactive {
    color: var(--text-muted);
    background: transparent;
    border: 1px solid var(--border-default);
  }

  .date {
    white-space: nowrap;
  }

  .actions {
    white-space: nowrap;
  }

  .link {
    padding: 0;
    margin-right: 12px;
    font: 700 13px/18px var(--font-heading);
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }

  .link.danger {
    color: var(--danger);
  }

  .link:hover:not(:disabled) {
    text-decoration: underline;
  }

  .empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
  }
</style>
