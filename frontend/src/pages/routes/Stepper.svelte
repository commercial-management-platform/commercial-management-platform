<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'

  interface Props {
    steps: { title: string; subtitle: string; done: boolean }[]
    current: number
    onselect: (index: number) => void
  }

  let { steps, current, onselect }: Props = $props()
</script>

<ol class="stepper card">
  {#each steps as step, i (step.title)}
    <li>
      <button class:done={step.done} class:current={i === current} onclick={() => onselect(i)}>
        <span class="marker">
          {#if step.done && i !== current}
            <Icon name="check" size={16} strokeWidth={2.4} />
          {:else}
            {i + 1}
          {/if}
        </span>
        <span class="text">
          <strong>{step.title}</strong>
          <small>{step.subtitle}</small>
        </span>
      </button>
    </li>
  {/each}
</ol>

<style>
  .stepper {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: hidden;
  }

  li + li {
    border-left: 1px solid var(--border-default);
  }

  button {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    height: 64px;
    padding: 0 18px;
    text-align: left;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover {
    background: var(--bg-surface-soft);
  }

  button.current {
    background: var(--brand-50);
    border-bottom-color: var(--brand-500);
  }

  .marker {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    font: 700 14px var(--font-heading);
    color: var(--text-muted);
    border-radius: 50%;
    background: var(--bg-surface-soft);
    border: 1px solid var(--border-default);
    transition:
      background 0.2s,
      color 0.2s;
  }

  .done .marker {
    color: var(--brand-600);
    background: var(--brand-100);
    border-color: transparent;
  }

  .current .marker {
    color: #fff;
    background: var(--brand-700);
    border-color: transparent;
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.3;
  }

  strong {
    font: 700 14px/18px var(--font-heading);
  }

  small {
    font-size: 12px;
    color: var(--text-muted);
  }

  @media (max-width: 760px) {
    .text small {
      display: none;
    }

    button {
      gap: 10px;
      padding: 0 12px;
    }

    strong {
      font-size: 13px;
    }
  }

  @media (max-width: 520px) {
    .text {
      display: none;
    }

    button {
      justify-content: center;
    }
  }
</style>
