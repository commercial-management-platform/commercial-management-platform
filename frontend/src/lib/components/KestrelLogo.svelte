<script lang="ts">
  /**
   * Logo de Kestrel: un cernícalo suspendido (alas abiertas) cuyo cuerpo
   * es a la vez un pin de mapa.
   *
   * - variant "light": tile blanco con el ave en verde (para fondos oscuros).
   * - variant "brand": tile verde con el ave en blanco (para fondos claros).
   */
  interface Props {
    variant?: 'light' | 'brand'
    size?: number
    showWordmark?: boolean
  }

  let { variant = 'brand', size = 44, showWordmark = true }: Props = $props()
</script>

<div class="logo {variant}">
  <span class="mark" style:width="{size}px" style:height="{size}px" aria-hidden="true">
    <svg viewBox="0 0 32 32" width={size * 0.78} height={size * 0.78} fill="none">
      <!-- Alas en vuelo estacionario -->
      <path
        d="M2.5 12.5C6 8.2 10.4 7.6 13.6 12M29.5 12.5C26 8.2 21.6 7.6 18.4 12"
        stroke="currentColor"
        stroke-width="2.6"
        stroke-linecap="round"
      />
      <!-- Cuerpo / pin de mapa -->
      <path
        fill="currentColor"
        fill-rule="evenodd"
        d="M16 9.2a5 5 0 0 1 5 5c0 4.2-5 11.6-5 11.6s-5-7.4-5-11.6a5 5 0 0 1 5-5Zm0 3.1a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z"
      />
    </svg>
  </span>

  {#if showWordmark}
    <span class="wordmark">
      <span class="name">Kestrel</span>
      <span class="tagline">Gestión comercial</span>
    </span>
  {/if}
</div>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }

  .mark {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border-radius: 12px;
  }

  .light .mark {
    background: #fff;
    color: var(--brand-700);
  }

  .brand .mark {
    background: linear-gradient(145deg, var(--brand-500), var(--brand-700));
    color: #fff;
    box-shadow: 0 6px 14px -6px rgba(0, 122, 85, 0.6);
  }

  .wordmark {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .name {
    font-family: var(--font-heading);
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .light .name {
    color: #fff;
  }

  .brand .name {
    color: var(--text-primary);
  }

  .tagline {
    margin-top: 4px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .light .tagline {
    color: var(--brand-300);
  }

  .brand .tagline {
    color: var(--brand-600);
  }
</style>
