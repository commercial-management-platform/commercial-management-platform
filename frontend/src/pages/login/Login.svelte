<script lang="ts">
  import type { Session } from '../../lib/services/auth'
  import BrandPanel from './BrandPanel.svelte'
  import LoginForm from './LoginForm.svelte'

  interface Props {
    onSuccess: (session: Session) => void
  }

  let { onSuccess }: Props = $props()
</script>

<div class="login">
  <BrandPanel />

  <main class="form-side">
    <LoginForm {onSuccess} />
  </main>
</div>

<style>
  .login {
    display: grid;
    grid-template-columns: 53fr 47fr;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .form-side {
    display: grid;
    place-items: center;
    padding: 40px 24px;
    background: var(--bg-page);
  }

  @media (max-width: 960px) {
    .login {
      grid-template-columns: 1fr;
    }

    .login :global(.panel) {
      display: none;
    }

    .form-side {
      padding: 24px 16px;
    }
  }
</style>
