<script lang="ts">
  import Icon, { type IconName } from '../../lib/components/Icon.svelte'
  import KestrelLogo from '../../lib/components/KestrelLogo.svelte'

  const features: { icon: IconName; label: string }[] = [
    { icon: 'users', label: 'Clientes' },
    { icon: 'map-pin', label: 'Visitas' },
    { icon: 'file-text', label: 'Pedidos' },
  ]

  const year = new Date().getFullYear()
</script>

<aside class="panel">
  <div class="decor" aria-hidden="true"></div>

  <KestrelLogo variant="light" />

  <div class="content">
    <span class="pill"><span class="dot"></span>Tu operación, en un solo lugar</span>

    <h2>Convierte cada oportunidad en crecimiento.</h2>

    <p class="lead">
      Centraliza clientes, organiza tu equipo y toma decisiones comerciales con información clara y
      actualizada.
    </p>

    <ul class="features">
      {#each features as feature (feature.label)}
        <li>
          <Icon name={feature.icon} size={22} />
          <span>{feature.label}</span>
        </li>
      {/each}
    </ul>
  </div>

  <p class="footer">© {year} Kestrel. Gestión simple, resultados sólidos.</p>
</aside>

<style>
  .panel {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 48px;
    padding: 80px 40px 40px;
    color: #fff;
    background:
      radial-gradient(circle at 78% 8%, rgba(16, 185, 129, 0.25), transparent 38%),
      var(--gradient-featured);
  }

  /* Anillo decorativo detrás del contenido */
  .decor {
    position: absolute;
    left: -180px;
    top: 240px;
    width: 560px;
    height: 560px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;
    pointer-events: none;
  }

  .decor::after {
    content: '';
    position: absolute;
    inset: 90px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 50%;
  }

  .content {
    position: relative;
    max-width: 520px;
    margin-top: 6px;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 5px 12px;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.03);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--brand-300);
  }

  h2 {
    margin-top: 44px;
    font-size: clamp(2.6rem, 4.2vw, 4rem);
    font-weight: 700;
    line-height: 1.06;
    letter-spacing: -0.02em;
  }

  .lead {
    margin-top: 32px;
    max-width: 480px;
    font-size: 1.08rem;
    font-weight: 300;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.72);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 20px 0 0;
    padding: 0;
    list-style: none;
  }

  .features li {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 16px;
    font-size: 0.92rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(4px);
    transition:
      background 0.2s,
      border-color 0.2s;
  }

  .features li :global(svg) {
    color: var(--brand-300);
  }

  .features li:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .footer {
    position: relative;
    margin-top: auto;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
  }
</style>
