<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import KestrelLogo from '../../lib/components/KestrelLogo.svelte'
  import { AuthError, DEMO_CREDENTIALS, login, type Session } from '../../lib/services/auth'

  interface Props {
    onSuccess: (session: Session) => void
  }

  let { onSuccess }: Props = $props()

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  let email = $state('')
  let password = $state('')
  let remember = $state(false)
  let showPassword = $state(false)
  let loading = $state(false)
  let submitted = $state(false)
  let formError = $state('')
  let notice = $state('')

  let emailError = $derived.by(() => {
    if (!email.trim()) return 'Ingresa tu correo electrónico.'
    if (!EMAIL_PATTERN.test(email.trim())) return 'Ingresa un correo válido.'
    return ''
  })

  let passwordError = $derived.by(() => {
    if (!password) return 'Ingresa tu contraseña.'
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
    return ''
  })

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    submitted = true
    formError = ''
    notice = ''
    if (emailError || passwordError) return

    loading = true
    try {
      const session = await login(email, password, remember)
      onSuccess(session)
    } catch (error) {
      formError = error instanceof AuthError ? error.message : 'No pudimos iniciar sesión. Intenta de nuevo.'
    } finally {
      loading = false
    }
  }

  function handleForgot(event: MouseEvent) {
    event.preventDefault()
    formError = ''
    notice = 'La recuperación de contraseña estará disponible pronto.'
  }
</script>

<div class="card">
  <KestrelLogo size={40} />

  <header>
    <p class="eyebrow">Bienvenido de nuevo</p>
    <h1>Inicia sesión</h1>
    <p class="subtitle">Ingresa tus datos para acceder a tu espacio de trabajo.</p>
  </header>

  <form onsubmit={handleSubmit} novalidate>
    {#if formError}
      <div class="alert error" role="alert">
        <Icon name="alert-circle" size={18} />
        <span>{formError}</span>
      </div>
    {:else if notice}
      <div class="alert info" role="status">
        <Icon name="alert-circle" size={18} />
        <span>{notice}</span>
      </div>
    {/if}

    <div class="field">
      <label for="email">Correo electrónico</label>
      <div class="control" class:invalid={submitted && emailError}>
        <Icon name="mail" size={18} class="lead-icon" />
        <input
          id="email"
          type="email"
          autocomplete="email"
          placeholder="nombre@empresa.com"
          bind:value={email}
          disabled={loading}
          aria-invalid={submitted && !!emailError}
          aria-describedby="email-error"
        />
      </div>
      {#if submitted && emailError}
        <p class="field-error" id="email-error">{emailError}</p>
      {/if}
    </div>

    <div class="field">
      <label for="password">Contraseña</label>
      <div class="control" class:invalid={submitted && passwordError}>
        <Icon name="lock" size={18} class="lead-icon" />
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          autocomplete="current-password"
          placeholder="Ingresa tu contraseña"
          bind:value={password}
          disabled={loading}
          aria-invalid={submitted && !!passwordError}
          aria-describedby="password-error"
        />
        <button
          type="button"
          class="toggle"
          onclick={() => (showPassword = !showPassword)}
          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
      {#if submitted && passwordError}
        <p class="field-error" id="password-error">{passwordError}</p>
      {/if}
    </div>

    <div class="row">
      <label class="checkbox">
        <input type="checkbox" bind:checked={remember} disabled={loading} />
        <span>Recordarme</span>
      </label>
      <a href="#recuperar" onclick={handleForgot}>¿Olvidaste tu contraseña?</a>
    </div>

    <button type="submit" class="submit" disabled={loading}>
      {#if loading}
        <Icon name="loader" size={20} class="spin" />
        <span>Ingresando…</span>
      {:else}
        <span>Ingresar a Kestrel</span>
        <Icon name="chevron-right" size={20} strokeWidth={2.2} />
      {/if}
    </button>
  </form>

  <p class="secure">
    <Icon name="lock" size={14} />
    Acceso seguro y datos protegidos
  </p>

  {#if import.meta.env.DEV}
    <p class="demo-hint">
      Demo: <code>{DEMO_CREDENTIALS.email}</code> / <code>{DEMO_CREDENTIALS.password}</code>
    </p>
  {/if}
</div>

<style>
  .card {
    width: 100%;
    max-width: 528px;
    padding: 48px 40px 40px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
  }

  header {
    margin-top: 28px;
  }

  .eyebrow {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--brand-600);
  }

  h1 {
    margin-top: 8px;
    font-size: 2.3rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  .subtitle {
    margin-top: 12px;
    color: var(--text-secondary);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 22px;
    margin-top: 36px;
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    font-size: 0.9rem;
    border-radius: var(--radius-sm);
  }

  .alert.error {
    color: var(--danger);
    background: var(--danger-bg);
    border: 1px solid #fecaca;
  }

  .alert.info {
    color: var(--brand-700);
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-size: 0.9rem;
    font-weight: 600;
  }

  .control {
    position: relative;
    display: flex;
    align-items: center;
    height: 52px;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .control:focus-within {
    border-color: var(--brand-500);
    box-shadow: var(--ring);
  }

  .control.invalid {
    border-color: var(--danger);
  }

  .control.invalid:focus-within {
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.12);
  }

  .control :global(.lead-icon) {
    position: absolute;
    left: 16px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .control:focus-within :global(.lead-icon) {
    color: var(--brand-600);
  }

  .control input {
    flex: 1;
    height: 100%;
    min-width: 0;
    padding: 0 16px 0 48px;
    border: 0;
    background: transparent;
    outline: none;
  }

  .control input::placeholder {
    color: var(--text-muted);
  }

  .toggle {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    margin-right: 4px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .toggle:hover {
    color: var(--brand-600);
  }

  .field-error {
    font-size: 0.82rem;
    color: var(--danger);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 0.9rem;
  }

  .checkbox {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .checkbox input {
    width: 17px;
    height: 17px;
    margin: 0;
    accent-color: var(--brand-600);
    cursor: pointer;
  }

  .submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 54px;
    margin-top: 4px;
    border: 0;
    border-radius: 999px;
    font-size: 1.12rem;
    font-weight: 500;
    color: #fff;
    background: var(--gradient-button);
    font-family: var(--font-heading);
    box-shadow: 0 10px 22px -10px rgba(0, 122, 85, 0.7);
    cursor: pointer;
    transition:
      transform 0.15s,
      box-shadow 0.15s,
      filter 0.15s;
  }

  .submit:hover:not(:disabled) {
    filter: brightness(1.08);
    transform: translateY(-1px);
    box-shadow: 0 14px 26px -10px rgba(0, 122, 85, 0.8);
  }

  .submit:active:not(:disabled) {
    transform: translateY(0);
  }

  .submit:disabled {
    cursor: progress;
    opacity: 0.85;
  }

  .submit :global(.spin) {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .secure {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 28px;
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .demo-hint {
    margin-top: 12px;
    font-size: 0.78rem;
    text-align: center;
    color: var(--text-muted);
  }

  .demo-hint code {
    padding: 1px 6px;
    border-radius: 6px;
    background: var(--bg-page);
    color: var(--text-secondary);
  }

  @media (max-width: 480px) {
    .card {
      padding: 32px 22px 28px;
    }

    h1 {
      font-size: 1.9rem;
    }
  }
</style>
