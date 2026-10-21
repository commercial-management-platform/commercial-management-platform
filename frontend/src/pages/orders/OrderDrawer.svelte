<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { ORDER_FLOW, nextOrderStatus, orderStatusLabel, subtotal } from '../../lib/domain/commerce'
  import { clientsStore } from '../../lib/stores/clients.svelte'
  import { quotesStore, setOrderStatus } from '../../lib/stores/commerce.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { Order } from '../../lib/types'
  import { formatDate, formatMoney } from '../../lib/utils/format'
  import { printDocument } from '../../lib/utils/printDocument'
  import { orderBadge } from '../quotes/badges'

  let { order, onclose }: { order: Order | null; onclose: () => void } = $props()

  let busy = $state(false)

  let client = $derived(order ? clientsStore.byId.get(order.clientId) : undefined)
  let quote = $derived(order?.quoteId ? quotesStore.byId.get(order.quoteId) : undefined)
  let next = $derived(order ? nextOrderStatus(order.estado) : null)
  let stepIndex = $derived(order ? ORDER_FLOW.indexOf(order.estado) : -1)

  async function move(estado: Order['estado']) {
    if (!order) return
    busy = true
    await setOrderStatus(order.id, estado)
    busy = false
  }

  function print() {
    if (!order) return
    const ok = printDocument({
      tipo: 'Pedido',
      numero: order.numero,
      fecha: order.fecha,
      cliente: {
        nombre: client?.razonSocial || order.cliente,
        nit: client?.nit ?? '—',
        direccion: client?.direccion ?? '',
        municipio: client?.municipio ?? '',
        contacto: client?.contacto.nombre ?? '',
      },
      items: order.items,
      meta: [
        ['Entrega estimada', formatDate(order.entrega)],
        ['Cotización', quote?.numero ?? '—'],
        ['Estado', orderStatusLabel[order.estado]],
      ],
    })
    if (!ok) toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'Ventana bloqueada', message: 'Permite las ventanas emergentes para imprimir.' })
  }
</script>

<Modal open={!!order} {onclose} variant="drawer" title={order?.numero ?? ''} subtitle={order?.cliente ?? ''}>
  {#snippet badge()}
    {#if order}<span class="badge {orderBadge[order.estado]}">{orderStatusLabel[order.estado]}</span>{/if}
  {/snippet}

  {#if order}
    <p class="total">{formatMoney(order.valor)}</p>

    {#if order.estado !== 'cancelado'}
      <ol class="flow" aria-label="Avance del pedido">
        {#each ORDER_FLOW as step, i (step)}
          <li class:done={i < stepIndex} class:current={i === stepIndex}>
            <span class="marker">
              {#if i < stepIndex || (i === stepIndex && step === 'entregado')}
                <Icon name="check" size={12} strokeWidth={3} />
              {/if}
            </span>
            {orderStatusLabel[step]}
          </li>
        {/each}
      </ol>
    {:else}
      <p class="cancelled"><Icon name="alert-circle" size={16} /> Este pedido fue cancelado.</p>
    {/if}

    <dl>
      <div><dt>Creado</dt><dd>{formatDate(order.fecha)}</dd></div>
      <div><dt>Entrega estimada</dt><dd>{formatDate(order.entrega)}</dd></div>
      <div><dt>Cotización</dt><dd>{quote?.numero ?? 'Pedido directo'}</dd></div>
      <div><dt>Dirección</dt><dd>{client ? `${client.direccion}, ${client.municipio}` : '—'}</dd></div>
    </dl>

    <h3>Detalle</h3>
    <table>
      <thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Subtotal</th></tr></thead>
      <tbody>
        {#each order.items as item, i (i)}
          <tr>
            <td>{item.producto}<small>{formatMoney(item.precio)} c/u</small></td>
            <td class="r">{item.cantidad}</td>
            <td class="r">{formatMoney(subtotal(item))}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    <div class="actions">
      {#if next}
        <button class="btn btn-primary" disabled={busy} onclick={() => move(next)}>
          Marcar como {orderStatusLabel[next].toLowerCase()}
        </button>
      {/if}
      {#if order.estado === 'confirmado' || order.estado === 'preparando'}
        <button class="btn btn-outline" disabled={busy} onclick={() => move('cancelado')}>Cancelar pedido</button>
      {/if}
      <button class="btn btn-outline" onclick={print}><Icon name="download" size={16} /> Imprimir / PDF</button>
    </div>
  {/if}
</Modal>

<style>
  .total {
    font: 800 30px/36px var(--font-heading);
  }

  .flow {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin: 20px 0 0;
    padding: 0;
    list-style: none;
  }

  .flow li {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font: 600 11px/16px var(--font-heading);
    text-align: center;
    color: var(--text-muted);
  }

  /* Línea entre pasos */
  .flow li + li::before {
    content: '';
    position: absolute;
    top: 10px;
    right: 50%;
    width: 100%;
    height: 2px;
    background: var(--border-default);
  }

  .flow li.done + li::before,
  .flow li.done + li.current::before {
    background: var(--brand-500);
  }

  .marker {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    color: #fff;
    border: 2px solid var(--border-default);
    border-radius: 50%;
    background: var(--bg-surface);
  }

  .done .marker {
    border-color: var(--brand-500);
    background: var(--brand-500);
  }

  .current {
    color: var(--text-brand);
  }

  .current .marker {
    border-color: var(--brand-700);
    background: var(--brand-700);
    box-shadow: 0 0 0 4px var(--brand-100);
  }

  .cancelled {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 10px 12px;
    font-size: 13px;
    color: var(--danger);
    border-radius: 10px;
    background: var(--danger-bg);
  }

  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    margin: 22px 0 0;
  }

  dt {
    font-size: 11px;
    color: var(--text-muted);
  }

  dd {
    margin: 2px 0 0;
    font-weight: 500;
  }

  h3 {
    margin: 24px 0 8px;
    font: 700 12px/18px var(--font-heading);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    padding: 8px 0;
    font: 600 11px var(--font-heading);
    text-align: left;
    text-transform: uppercase;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-default);
  }

  td {
    padding: 10px 0;
    border-bottom: 1px solid var(--border-default);
  }

  td small {
    display: block;
    font-size: 11px;
    color: var(--text-muted);
  }

  .r {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }
</style>
