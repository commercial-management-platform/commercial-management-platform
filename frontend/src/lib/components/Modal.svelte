<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  interface Props {
    open: boolean
    title: string
    subtitle?: string
    onclose: () => void
    children: Snippet
    footer?: Snippet
    /** Contenido extra a la derecha del título (p. ej. una etiqueta de estado). */
    badge?: Snippet
    size?: 'md' | 'lg'
    /** "drawer" lo muestra como panel lateral derecho. */
    variant?: 'dialog' | 'drawer'
  }

  let { open, title, subtitle, onclose, children, footer, badge, size = 'md', variant = 'dialog' }: Props =
    $props()

  let dialog: HTMLDialogElement

  $effect(() => {
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog
  class="{variant} {size}"
  bind:this={dialog}
  onclose={onclose}
  onclick={(e) => e.target === dialog && onclose()}
  aria-labelledby="modal-title"
>
  <div class="panel">
    <header>
      <div>
        <h2 id="modal-title">{title} {#if badge}{@render badge()}{/if}</h2>
        {#if subtitle}<p>{subtitle}</p>{/if}
      </div>
      <button class="close" onclick={onclose} aria-label="Cerrar">
        <Icon name="x" size={18} />
      </button>
    </header>

    <div class="content">
      {@render children()}
    </div>

    {#if footer}
      <footer>{@render footer()}</footer>
    {/if}
  </div>
</dialog>

<style>
  dialog {
    width: min(520px, calc(100vw - 32px));
    padding: 0;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    color: var(--text-primary);
    box-shadow: 0 30px 60px -20px rgba(15, 23, 42, 0.35);
  }

  dialog::backdrop {
    background: rgba(7, 61, 49, 0.45);
    backdrop-filter: blur(2px);
  }

  dialog[open] {
    animation: pop 0.18s ease-out;
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }
  }

  .panel {
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 48px);
    padding: 24px;
  }

  dialog.lg {
    width: min(680px, calc(100vw - 32px));
  }

  /* Panel lateral */
  dialog.drawer {
    width: min(460px, 100vw);
    height: 100dvh;
    max-height: 100dvh;
    margin: 0 0 0 auto;
    border-radius: var(--radius-lg) 0 0 var(--radius-lg);
  }

  dialog.drawer[open] {
    animation: slide 0.22s ease-out;
  }

  dialog.drawer .panel {
    height: 100%;
    max-height: none;
  }

  @keyframes slide {
    from {
      transform: translateX(40px);
      opacity: 0;
    }
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  h2 {
    font-size: 1.2rem;
    font-weight: 700;
  }

  header p {
    margin-top: 4px;
    font-size: 0.88rem;
    color: var(--text-secondary);
  }

  .close {
    display: grid;
    place-items: center;
    padding: 6px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .close:hover {
    background: var(--bg-page);
    color: var(--text-primary);
  }

  .content {
    flex: 1;
    min-height: 0;
    margin-top: 20px;
    overflow-y: auto;
  }

  h2 {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
  }

  /* En móvil los botones se reparten el ancho y pasan a otra fila si no caben. */
  @media (max-width: 520px) {
    .panel {
      padding: 20px;
    }

    footer {
      margin-top: 20px;
    }

    footer > :global(*) {
      flex: 1 1 auto;
    }
  }
</style>
