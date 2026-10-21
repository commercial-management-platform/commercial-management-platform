<script lang="ts">
  import Icon from './Icon.svelte'

  interface Props {
    page: number
    total: number
    size: number
  }

  let { page = $bindable(), total, size }: Props = $props()

  let pages = $derived(Math.max(1, Math.ceil(total / size)))

  // Si la lista se encoge (filtros, eventos en vivo) no queda en una página vacía.
  $effect(() => {
    if (page > pages - 1) page = pages - 1
  })
</script>

{#if total > size}
  <footer class="pager">
    <span>Mostrando {page * size + 1}–{Math.min((page + 1) * size, total)} de {total}</span>
    <div>
      <button onclick={() => page--} disabled={page === 0} aria-label="Página anterior">
        <Icon name="chevron-left" size={16} />
      </button>
      <span class="num">{page + 1} / {pages}</span>
      <button onclick={() => page++} disabled={page >= pages - 1} aria-label="Página siguiente">
        <Icon name="chevron-right" size={16} />
      </button>
    </div>
  </footer>
{/if}

<style>
  .pager {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    font-size: 12px;
    color: var(--text-secondary);
    border-top: 1px solid var(--border-default);
  }

  div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    background: var(--bg-surface);
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .num {
    min-width: 48px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
</style>
