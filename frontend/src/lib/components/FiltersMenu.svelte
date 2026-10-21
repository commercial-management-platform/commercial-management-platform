<script lang="ts">
  import type { Snippet } from 'svelte'
  import { fade } from 'svelte/transition'

  interface Props {
    /** Número de filtros activos (se muestra como contador). */
    count?: number
    onclear?: () => void
    children: Snippet
  }

  let { count = 0, onclear, children }: Props = $props()

  let open = $state(false)
  let root = $state<HTMLDivElement>()
</script>

<svelte:window onclick={(e) => open && !root?.contains(e.target as Node) && (open = false)} />

<div class="filters" bind:this={root}>
  <button class="btn btn-outline" aria-expanded={open} onclick={() => (open = !open)}>
    Filtros
    {#if count}<span class="count">{count}</span>{/if}
  </button>
  {#if open}
    <div class="popover" transition:fade={{ duration: 120 }}>
      {@render children()}
      {#if count && onclear}<button class="clear" onclick={onclear}>Limpiar filtros</button>{/if}
    </div>
  {/if}
</div>

<style>
  .filters {
    position: relative;
  }

  .count {
    display: grid;
    place-items: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    font-size: 11px;
    color: #fff;
    border-radius: 999px;
    background: var(--brand-600);
  }

  .popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 230px;
    padding: 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 12px;
    box-shadow: 0 16px 32px -12px rgba(15, 23, 42, 0.25);
  }

  .popover :global(.filter-title) {
    font: 600 11px/16px var(--font-heading);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .popover :global(.filter-check) {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .popover :global(.filter-check input) {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--brand-600);
  }

  .popover :global(.select) {
    width: 100%;
    height: 38px;
  }

  .clear {
    align-self: flex-start;
    padding: 0;
    font-size: 13px;
    color: var(--text-brand);
    border: 0;
    background: none;
    cursor: pointer;
  }
</style>
