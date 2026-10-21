<script lang="ts">
  import AnimatedNumber from './AnimatedNumber.svelte'

  interface Props {
    label: string
    value: number
    format?: (value: number) => string
    flash?: boolean
  }

  let { label, value, format, flash = false }: Props = $props()
</script>

<article class="card stat" class:flash>
  <p>{label}</p>
  <strong><AnimatedNumber {value} {format} /></strong>
</article>

<style>
  .stat {
    position: relative;
    padding: 20px;
  }

  .stat.flash::after {
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

  p {
    font-size: 12px;
    color: var(--text-muted);
  }

  strong {
    display: block;
    margin-top: 4px;
    font: 800 24px/32px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }
</style>
