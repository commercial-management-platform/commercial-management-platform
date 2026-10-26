<script lang="ts">
  import { flip } from 'svelte/animate'
  import { fly } from 'svelte/transition'
  import { toasts } from '../stores/toasts.svelte'
  import Icon from './Icon.svelte'
</script>

<div class="stack" aria-live="polite">
  {#each toasts.items as toast (toast.id)}
    <div class="toast {toast.tone}" animate:flip={{ duration: 250 }} transition:fly={{ x: 40, duration: 250 }}>
      <span class="icon"><Icon name={toast.icon} size={16} strokeWidth={2} /></span>
      <div class="body">
        <strong>{toast.title}</strong>
        <span>{toast.message}</span>
      </div>
      <button onclick={() => toasts.dismiss(toast.id)} aria-label="Cerrar notificación">
        <Icon name="x" size={14} />
      </button>
    </div>
  {/each}
</div>

<style>
  .stack {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(340px, calc(100vw - 32px));
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 12px 12px 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: 0 12px 28px -12px rgba(15, 23, 42, 0.3);
    pointer-events: auto;
  }

  .icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }

  .success .icon {
    color: var(--brand-600);
    background: var(--brand-50);
  }

  .info .icon {
    color: #2563eb;
    background: #eff6ff;
  }

  .warning .icon {
    color: #b45309;
    background: #fffbeb;
  }

  .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    font-size: 0.82rem;
    color: var(--text-secondary);
  }

  .body strong {
    font-size: 0.88rem;
    color: var(--text-primary);
  }

  button {
    display: grid;
    place-items: center;
    padding: 4px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  button:hover {
    background: var(--bg-page);
  }
</style>
