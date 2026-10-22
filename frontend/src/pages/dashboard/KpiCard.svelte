<script lang="ts">
  import AnimatedNumber from "../../lib/components/AnimatedNumber.svelte";
  import Icon, { type IconName } from "../../lib/components/Icon.svelte";

  interface Props {
    icon: IconName;
    label: string;
    value: number;
    format?: (value: number) => string;
    detail: string;
    /** Variación contra el periodo anterior; se muestra con flecha y color. */
    trend?: string | null;
    trendUp?: boolean;
    featured?: boolean;
    flash?: boolean;
  }

  let {
    icon,
    label,
    value,
    format,
    detail,
    trend = null,
    trendUp = true,
    featured = false,
    flash = false,
  }: Props = $props();
</script>

<article class="kpi" class:featured class:flash>
  <span class="icon"><Icon name={icon} size={18} /></span>
  <p class="label">{label}</p>
  <p class="value"><AnimatedNumber {value} {format} /></p>
  <p class="detail">
    {#if trend}
      <span class="trend" class:down={!trendUp}>
        <Icon
          name={trendUp ? "arrow-up" : "arrow-down"}
          size={12}
          strokeWidth={2.4}
        />{trend}
      </span>
    {/if}
    {detail}
  </p>
</article>

<style>
  .kpi {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 16px 16px 18px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 14px;
    box-shadow: -2px 2px 4px rgba(15, 23, 42, 0.1);
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .kpi:focus-within,
  .kpi:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -16px rgba(15, 23, 42, 0.25);
  }

  .kpi.flash::after {
    content: "";
    position: absolute;
    inset: -1px;
    border: 2px solid var(--brand-300);
    border-radius: inherit;
    pointer-events: none;
    animation: ring 2.4s ease-out forwards;
  }

  @keyframes ring {
    0% {
      opacity: 1;
      box-shadow: 0 0 0 0 rgba(110, 231, 183, 0.45);
    }
    30% {
      box-shadow: 0 0 0 8px rgba(110, 231, 183, 0);
    }
    100% {
      opacity: 0;
    }
  }

  .icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    color: var(--brand-600);
    background: var(--brand-50);
  }

  .label {
    margin-top: 16px;
    font-size: 0.86rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .value {
    margin-top: 8px;
    font: 800 30px/36px var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  .detail {
    margin-top: 10px;
    font-size: 0.8125rem;
    line-height: 1.35;
    font-variant-numeric: tabular-nums;
    color: var(--text-secondary);
  }

  .trend {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    margin-right: 4px;
    font-weight: 600;
    color: var(--brand-600);
  }

  .trend.down {
    color: var(--danger);
  }

  .featured {
    color: #fff;
    border-color: transparent;
    background: var(--gradient-featured);
  }

  .featured .icon {
    color: var(--brand-700);
    background: #fff;
  }

  .featured .label,
  .featured .detail {
    color: rgba(255, 255, 255, 0.92);
  }
</style>
