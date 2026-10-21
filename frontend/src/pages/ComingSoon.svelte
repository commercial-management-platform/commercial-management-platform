<script lang="ts">
  import KestrelLogo from '../lib/components/KestrelLogo.svelte'

  let { title }: { title: string } = $props()
</script>

<section class="card coming">
  <KestrelLogo showWordmark={false} size={52} />
  <h1>{title}</h1>
  <p>Esta sección está en construcción.</p>
  <a class="btn btn-outline" href="#/dashboard">Volver al dashboard</a>
</section>

<style>
  .coming {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    max-width: 1240px;
    padding: 72px 24px;
    text-align: center;
  }

  h1 {
    margin-top: 8px;
    font-size: 1.5rem;
    font-weight: 700;
  }

  p {
    color: var(--text-secondary);
  }

  a {
    margin-top: 8px;
    text-decoration: none;
  }
</style>
