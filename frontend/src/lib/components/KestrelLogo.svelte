<script lang="ts">
  /**
   * Logo de Kestrel: un cernícalo suspendido (alas abiertas) cuyo cuerpo
   * es a la vez un pin de mapa.
   *
   * - variant "light": tile blanco con el ave en verde (para fondos oscuros).
   * - variant "brand": tile verde con el ave en blanco (para fondos claros).
   */
  interface Props {
    variant?: "light" | "brand";
    size?: number;
    showWordmark?: boolean;
  }

  let { variant = "brand", size = 44, showWordmark = true }: Props = $props();

  const logoSrc = $derived(
    variant === "light" ? "/logo-white.jpg" : "/logo-green.jpg",
  );
</script>

<div class="logo {variant}">
  <span
    class="mark"
    style:width="{size}px"
    style:height="{size}px"
    aria-hidden="true"
  >
    <img
      src={logoSrc}
      alt="Kestrel Logo"
      style:width="{size * 0.85}px"
      style:height="{size * 0.85}px"
    />
  </span>

  {#if showWordmark}
    <span class="wordmark">
      <img
        src="/wordmark.png"
        alt="Kestrel"
        class="name-img"
        style:height="{size * 0.45}px"
      />
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
    overflow: hidden;
  }

  .light .mark {
    background: #000;
  }

  .brand .mark {
    background: #fff;
    box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.1);
  }

  .mark img {
    object-fit: cover;
  }

  .wordmark {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .name-img {
    display: block;
    object-fit: contain;
    width: auto;
  }

  .light .name-img {
    filter: brightness(0) invert(1);
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
