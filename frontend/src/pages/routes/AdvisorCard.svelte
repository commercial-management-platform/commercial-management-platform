<script lang="ts">
  import AnimatedNumber from '../../lib/components/AnimatedNumber.svelte'
  import { router } from '../../lib/router.svelte'
  import type { AdvisorStats } from '../../lib/stores/routes.svelte'

  let { stats, flash = false }: { stats: AdvisorStats; flash?: boolean } = $props()

  let initials = $derived(
    stats.advisor.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
  )
  const pct = (v: number) => `${Math.round(v)}%`
</script>

<article class="card advisor" class:flash>
  <header>
    <span class="avatar">{initials}</span>
    <div>
      <h2>{stats.advisor.name}</h2>
      <p>{stats.zonas.length ? stats.zonas.join(', ') : 'Sin rutas activas'}</p>
    </div>
  </header>

  <dl class="box">
    <div>
      <dt>Asignación</dt>
      <dd>{stats.rutas} {stats.rutas === 1 ? 'ruta' : 'rutas'}</dd>
    </div>
    <div>
      <dt>Cumplimiento</dt>
      <dd class="brand"><AnimatedNumber value={stats.cumplimiento} format={pct} /></dd>
    </div>
  </dl>

  <div class="progress">
    <span>{stats.realizadas} de {stats.meta} visitas de la semana</span>
    <strong><AnimatedNumber value={stats.cumplimiento} format={pct} /></strong>
  </div>
  <div class="bar" role="progressbar" aria-valuenow={stats.cumplimiento} aria-valuemin={0} aria-valuemax={100}>
    <span style:width="{stats.cumplimiento}%"></span>
  </div>

  <button class="see" onclick={() => router.go('rutas/asignadas', { asesor: String(stats.advisor.id) })}>
    Ver asignaciones
  </button>
</article>

<style>
  .advisor {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 20px;
  }

  .advisor.flash::after {
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

  header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    font: 700 13px var(--font-heading);
    color: #fff;
    border-radius: 50%;
    background: var(--brand-700);
  }

  h2 {
    font-size: 15px;
    line-height: 22px;
  }

  header p {
    font-size: 11px;
    color: var(--text-muted);
  }

  .box {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin: 20px 0 0;
    padding: 12px;
    border-radius: 12px;
    background: var(--bg-surface-soft);
  }

  dt {
    font-size: 10px;
    color: var(--text-muted);
  }

  dd {
    margin: 4px 0 0;
    font: 700 13px/18px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  dd.brand {
    color: var(--text-brand);
  }

  .progress {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .progress strong {
    font: 700 11px var(--font-heading);
    color: var(--text-brand);
  }

  .bar {
    height: 6px;
    margin-top: 8px;
    border-radius: 999px;
    background: var(--neutral-100);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--brand-700);
    transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .see {
    height: 42px;
    margin-top: 20px;
    font-size: 15px;
    color: var(--text-brand);
    border: 1px solid var(--border-brand);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    cursor: pointer;
    transition: background 0.15s;
  }

  .see:hover {
    background: var(--brand-50);
  }
</style>
