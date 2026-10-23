<script lang="ts">
  import Modal from '../../lib/components/Modal.svelte'
  import { roleLabel, type UserRole } from '../../lib/services/auth'
  import { PASSWORD_MIN_LENGTH, createUser, updateUser, type ApiUser } from '../../lib/services/usersApi'
  import { errorText } from '../../lib/stores/clientDirectory.svelte'

  // Crear un usuario o editar su nombre. El rol y el estado se cambian desde la tabla.

  interface Props {
    open: boolean
    user: ApiUser | null
    onclose: () => void
    onsaved: (user: ApiUser) => void
  }

  let { open, user, onclose, onsaved }: Props = $props()

  const ROLES = Object.keys(roleLabel) as UserRole[]
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  let name = $state('')
  let email = $state('')
  let password = $state('')
  let role = $state<UserRole>('advisor')
  let showErrors = $state(false)
  let saving = $state(false)
  let error = $state('')

  $effect(() => {
    if (!open) return
    name = user?.name ?? ''
    email = user?.email ?? ''
    password = ''
    role = user?.role ?? 'advisor'
    showErrors = false
    error = ''
  })

  let errors = $derived.by(() => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Escribe el nombre.'
    if (!user) {
      if (!EMAIL.test(email.trim())) e.email = 'Correo inválido.'
      if (password.length < PASSWORD_MIN_LENGTH) e.password = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`
    }
    return e
  })
  let err = $derived(showErrors ? errors : {})

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    showErrors = true
    if (Object.keys(errors).length) return
    saving = true
    error = ''
    try {
      const saved = user
        ? await updateUser(user.id, { name: name.trim() })
        : await createUser({ name: name.trim(), email: email.trim().toLowerCase(), password, role })
      onsaved(saved)
      onclose()
    } catch (e) {
      error = errorText(e, 'No se pudo guardar el usuario.')
    } finally {
      saving = false
    }
  }
</script>

<Modal {open} {onclose} title={user ? 'Editar usuario' : 'Nuevo usuario'} subtitle={user ? user.email : 'Crea la cuenta con su rol inicial.'}>
  <form id="user-form" class="form" onsubmit={submit} novalidate>
    <label class="field full">
      <span>Nombre completo</span>
      <input class="input" class:invalid={err.name} bind:value={name} autocomplete="off" />
      {#if err.name}<small>{err.name}</small>{/if}
    </label>

    {#if !user}
      <label class="field full">
        <span>Correo</span>
        <input class="input" class:invalid={err.email} type="email" bind:value={email} autocomplete="off" />
        {#if err.email}<small>{err.email}</small>{/if}
      </label>
      <label class="field">
        <span>Contraseña inicial</span>
        <input class="input" class:invalid={err.password} type="password" bind:value={password} autocomplete="new-password" />
        {#if err.password}<small>{err.password}</small>{/if}
      </label>
      <label class="field">
        <span>Rol</span>
        <select class="select" bind:value={role}>
          {#each ROLES as r (r)}<option value={r}>{roleLabel[r]}</option>{/each}
        </select>
      </label>
    {/if}

    {#if error}<p class="error full" role="alert">{error}</p>{/if}
  </form>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="user-form" disabled={saving}>
      {saving ? 'Guardando…' : user ? 'Guardar' : 'Crear usuario'}
    </button>
  {/snippet}
</Modal>

<style>
  .form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .field small {
    font-weight: 400;
    color: var(--danger);
  }

  .field :global(.select),
  .field :global(.input) {
    width: 100%;
    font-weight: 400;
  }

  .full {
    grid-column: 1 / -1;
  }

  .invalid {
    border-color: var(--danger);
  }

  .error {
    font-size: 0.85rem;
    color: var(--danger);
  }
</style>
