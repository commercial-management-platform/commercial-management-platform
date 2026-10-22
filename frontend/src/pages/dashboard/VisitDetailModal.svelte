<script lang="ts">
  import Modal from '../../lib/components/Modal.svelte'
  import type { VisitRow } from '../../lib/types'
  import { formatDate, formatMoney, formatTime } from '../../lib/utils/format'
  import { visitStatusLabel } from './visitLabels'

  interface Props {
    visit: VisitRow | null
    onclose: () => void
  }

  let { visit, onclose }: Props = $props()
</script>

<Modal open={!!visit} {onclose} title={visit?.cliente ?? ''} subtitle="Detalle de la visita">
  {#if visit}
    <dl>
      <div><dt>Fecha</dt><dd>{formatDate(visit.fecha)} · {formatTime(visit.fecha)}</dd></div>
      <div><dt>Estado</dt><dd><span class="badge {visit.estado}">{visitStatusLabel[visit.estado]}</span></dd></div>
      <div><dt>Municipio</dt><dd>{visit.municipio}</dd></div>
      <div><dt>Tipo de cliente</dt><dd>{visit.tipo}</dd></div>
      <div><dt>Potencial</dt><dd>{visit.potencial}</dd></div>
      <div><dt>Resultado</dt><dd>{visit.resultado ?? '—'}</dd></div>
      <div><dt>Cotización</dt><dd>{visit.cotizacion ? formatMoney(visit.cotizacion) : '—'}</dd></div>
      {#if visit.observacion}
        <div class="full"><dt>Observación</dt><dd>{visit.observacion}</dd></div>
      {/if}
    </dl>
  {/if}
</Modal>

<style>
  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px 24px;
    margin: 0;
  }

  .full {
    grid-column: 1 / -1;
  }

  dt {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  dd {
    margin: 4px 0 0;
    font-size: 0.92rem;
  }

  .badge {
    padding: 3px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 999px;
    background: var(--bg-page);
    color: var(--text-secondary);
  }

  .badge.visitado {
    color: var(--brand-700);
    background: var(--brand-50);
  }
</style>
