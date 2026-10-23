<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { subtotal } from '../../lib/domain/commerce'
  import { can } from '../../lib/permissions.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import { getQuote, type ApiQuoteDetail } from '../../lib/services/quotesApi'
  import {
    SALES_ORDER_FLOW,
    SALES_ORDER_NEXT,
    SALES_ORDER_STATUS_LABELS,
    type ApiSalesOrder,
    type SalesOrderStatus,
  } from '../../lib/services/salesOrdersApi'
  import { advisors } from '../../lib/stores/advisors.svelte'
  import { clientDirectory, errorText } from '../../lib/stores/clientDirectory.svelte'
  import { quotesStore, setOrderStatus, toLineItem } from '../../lib/stores/commerce.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { LineItem } from '../../lib/types'
  import { formatDate, formatMoney } from '../../lib/utils/format'
  import { printDocument } from '../../lib/utils/printDocument'
  import { orderBadge } from '../quotes/badges'

  let { order, onclose }: { order: ApiSalesOrder | null; onclose: () => void } = $props()

  let busy = $state(false)
  /** Productos de la cotización de origen; el pedido en sí solo guarda el valor. */
  let details = $state<ApiQuoteDetail[] | null>(null)

  let client = $derived(order ? clientDirectory.byId.get(order.clientId) : undefined)
  let quote = $derived(order?.quoteId ? quotesStore.byId.get(order.quoteId) : undefined)
  let next = $derived(order ? SALES_ORDER_NEXT[order.status].find((s) => s !== 'cancelled') : undefined)
  let canCancel = $derived(!!order && SALES_ORDER_NEXT[order.status].includes('cancelled'))
  let stepIndex = $derived(order ? SALES_ORDER_FLOW.indexOf(order.status) : -1)
  let items = $derived<LineItem[]>(
    details
      ? details.map(toLineItem)
      : order
        ? [{ producto: `Pedido ${order.number}`, cantidad: 1, precio: Number(order.value) }]
        : [],
  )

  const day = (date: string) => `${date}T12:00:00`

  $effect(() => {
    details = null
    const quoteId = order?.quoteId
    if (!quoteId) return
    getQuote(quoteId)
      .then((full) => order?.quoteId === quoteId && (details = full.details))
      .catch(() => {})
  })

  async function move(status: SalesOrderStatus) {
    if (!order) return
    busy = true
    try {
      await setOrderStatus(order.id, status)
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo cambiar el estado', message: errorText(e, 'Intenta de nuevo.') })
    } finally {
      busy = false
    }
  }

  function print() {
    if (!order) return
    const ok = printDocument({
      tipo: 'Pedido',
      numero: order.number,
      fecha: day(order.date),
      cliente: {
        nombre: client?.businessName ?? `Cliente #${order.clientId}`,
        nit: client?.nit ?? '—',
        direccion: client?.address ?? '',
        municipio: client?.municipality ?? '',
        contacto: '',
      },
      items,
      meta: [
        ['Entrega estimada', formatDate(day(order.estimatedDeliveryDate))],
        ['Cotización', quote?.number ?? '—'],
        ['Estado', SALES_ORDER_STATUS_LABELS[order.status]],
      ],
    })
    if (!ok) toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'Ventana bloqueada', message: 'Permite las ventanas emergentes para imprimir.' })
  }
</script>

<Modal
  open={!!order}
  {onclose}
  variant="drawer"
  title={order?.number ?? ''}
  subtitle={client ? clientDisplayName(client) : order ? `Cliente #${order.clientId}` : ''}
>
  {#snippet badge()}
    {#if order}<span class="badge {orderBadge[order.status]}">{SALES_ORDER_STATUS_LABELS[order.status]}</span>{/if}
  {/snippet}

  {#if order}
    <p class="total">{formatMoney(Number(order.value))}</p>

    {#if order.status !== 'cancelled'}
      <ol class="flow" aria-label="Avance del pedido">
        {#each SALES_ORDER_FLOW as step, i (step)}
          <li class:done={i < stepIndex} class:current={i === stepIndex}>
            <span class="marker">
              {#if i < stepIndex || (i === stepIndex && step === 'delivered')}
                <Icon name="check" size={12} strokeWidth={3} />
              {/if}
            </span>
            {SALES_ORDER_STATUS_LABELS[step]}
          </li>
        {/each}
      </ol>
    {:else}
      <p class="cancelled"><Icon name="alert-circle" size={16} /> Este pedido fue cancelado.</p>
    {/if}

    <dl>
      <div><dt>Fecha</dt><dd>{formatDate(day(order.date))}</dd></div>
      <div><dt>Entrega estimada</dt><dd>{formatDate(day(order.estimatedDeliveryDate))}</dd></div>
      <div><dt>Cotización</dt><dd>{quote?.number ?? (order.quoteId ? `#${order.quoteId}` : 'Pedido directo')}</dd></div>
      <div><dt>Asesor</dt><dd>{advisors.name(order.advisorId)}</dd></div>
      <div class="full">
        <dt>Dirección</dt>
        <dd>{client ? [client.address, client.municipality].filter(Boolean).join(', ') || '—' : '—'}</dd>
      </div>
    </dl>

    {#if details}
      <h3>Productos de la cotización</h3>
      <table>
        <thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Subtotal</th></tr></thead>
        <tbody>
          {#each items as item, i (i)}
            <tr>
              <td>{item.producto}<small>{formatMoney(item.precio)} c/u</small></td>
              <td class="r">{item.cantidad}</td>
              <td class="r">{formatMoney(subtotal(item))}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else if !order.quoteId}
      <p class="note">Pedido directo: se registra solo el valor total.</p>
    {/if}

    <div class="actions">
      {#if can.isManager && next}
        <button class="btn btn-primary" disabled={busy} onclick={() => move(next!)}>
          Marcar como {SALES_ORDER_STATUS_LABELS[next].toLowerCase()}
        </button>
      {/if}
      {#if can.isManager && canCancel}
        <button class="btn btn-outline" disabled={busy} onclick={() => move('cancelled')}>Cancelar pedido</button>
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

  .full {
    grid-column: 1 / -1;
  }

  .note {
    margin-top: 20px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }
</style>
