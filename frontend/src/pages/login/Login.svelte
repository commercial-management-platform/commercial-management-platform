<script lang="ts">
  import logoBlanco from '../../assets/logo blanco.svg'
  import type { Session } from '../../lib/services/auth'
  import BrandPanel from './BrandPanel.svelte'
  import LoginForm from './LoginForm.svelte'

  interface Props {
    onSuccess: (session: Session) => void
  }

  let { onSuccess }: Props = $props()

  const year = new Date().getFullYear()
</script>

<div class="login">
  <BrandPanel />

  <main class="form-side">
    <div class="backdrop" aria-hidden="true">
      <img class="bird top" src={logoBlanco} alt="" />
      <img class="bird bottom" src={logoBlanco} alt="" />
    </div>

    <LoginForm {onSuccess} />

    <p class="mobile-foot">© {year} Kestrel · Gestión simple, resultados sólidos.</p>
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
    position: relative;
    display: grid;
    place-items: center;
    padding: 40px 24px;
    background: var(--bg-page);
  }

  /* La decoración y el pie solo existen en móvil, donde no está el panel de marca. */
  .backdrop,
  .mobile-foot {
    display: none;
  }

  @media (max-width: 960px) {
    .login {
      grid-template-columns: 1fr;
    }

    .login :global(.panel) {
      display: none;
    }

    .form-side {
      overflow: hidden;
      /* Sin esto la columna crece al ancho del texto más largo y desborda en 320 px. */
      grid-template-columns: minmax(0, 1fr);
      align-content: center;
      gap: 20px;
      padding: 72px 16px 40px;
      background:
        radial-gradient(circle at 85% 0%, rgba(16, 185, 129, 0.3), transparent 45%),
        var(--gradient-featured);
    }

    .form-side > :global(.card) {
      position: relative;
      z-index: 1;
    }

    .backdrop {
      display: block;
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    /* El cernícalo de la marca como marca de agua, asomando por dos esquinas. */
    .bird {
      position: absolute;
      opacity: 0.08;
    }

    .bird.top {
      top: -40px;
      right: -70px;
      width: 260px;
      transform: rotate(-8deg);
    }

    .bird.bottom {
      bottom: -60px;
      left: -90px;
      width: 300px;
      transform: scaleX(-1) rotate(-10deg);
    }

    .mobile-foot {
      display: block;
      position: relative;
      z-index: 1;
      font-size: 0.78rem;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
    }
  }

  /* En pantallas bajas (teclado abierto, horizontal) la tarjeta ocupa casi todo el alto. */
  @media (max-width: 960px) and (max-height: 640px) {
    .form-side {
      padding-top: 24px;
    }
  }
</style>
