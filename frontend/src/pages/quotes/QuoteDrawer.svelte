<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { quoteStatusLabel, subtotal } from '../../lib/domain/commerce'
  import { router } from '../../lib/router.svelte'
  import { clientsStore } from '../../lib/stores/clients.svelte'
  import { createOrder, ordersStore, setQuoteStatus } from '../../lib/stores/commerce.svelte'
  import { routesStore } from '../../lib/stores/routes.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { Quote } from '../../lib/types'
  import { formatDate, formatMoney } from '../../lib/utils/format'
  import { printDocument } from '../../lib/utils/printDocument'
  import { quoteBadge } from './badges'

  let { quote, onclose }: { quote: Quote | null; onclose: () => void } = $props()

  let busy = $state(false)

  let client = $derived(quote ? clientsStore.byId.get(quote.clientId) : undefined)
  let vence = $derived(quote ? new Date(Date.parse(quote.fecha) + quote.vigenciaDias * 86_400_000) : null)
  let expired = $derived(
    !!quote && !!vence && vence.getTime() < Date.now() && quote.estado !== 'aprobada' && quote.estado !== 'rechazada',
  )
  let order = $derived(quote ? ordersStore.items.find((o) => o.quoteId === quote.id) : undefined)

  async function setStatus(estado: Quote['estado']) {
    if (!quote) return
    busy = true
    await setQuoteStatus(quote.id, estado)
    busy = false
  }

  async function toOrder() {
    if (!quote) return
    busy = true
    try {
      const entrega = new Date(Date.now() + 5 * 86_400_000).toISOString()
      const created = await createOrder({ clientId: quote.clientId, entrega, items: quote.items, quoteId: quote.id })
      toasts.push({ tone: 'success', icon: 'package', title: 'Pedido creado', message: `${created.numero} desde ${quote.numero}` })
      onclose()
      router.go('pedidos', { nuevo: created.id })
    } finally {
      busy = false
    }
  }

  function print() {
    if (!quote) return
    const ok = printDocument({
      tipo: 'Cotización',
      numero: quote.numero,
      fecha: quote.fecha,
      cliente: {
        nombre: client?.razonSocial || quote.cliente,
        nit: client?.nit ?? '—',
        direccion: client?.direccion ?? '',
        municipio: client?.municipio ?? '',
        contacto: client?.contacto.nombre ?? '',
      },
      items: quote.items,
      meta: [
        ['Vigencia', `${quote.vigenciaDias} días`],
        ['Válida hasta', vence ? formatDate(vence.toISOString()) : '—'],
        ['Asesor', routesStore.asesorById.get(quote.asesorId)?.nombre ?? '—'],
        ['Estado', quoteStatusLabel[quote.estado]],
      ],
    })
    if (!ok) toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'Ventana bloqueada', message: 'Permite las ventanas emergentes para imprimir.' })
  }
</script>

<Modal open={!!quote} {onclose} variant="drawer" title={quote?.numero ?? ''} subtitle={quote?.cliente ?? ''}>
  {#snippet badge()}
    {#if quote}<span class="badge {quoteBadge[quote.estado]}">{quoteStatusLabel[quote.estado]}</span>{/if}
  {/snippet}

  {#if quote}
    <p class="total">{formatMoney(quote.valor)}</p>

    <dl>
      <div><dt>Fecha</dt><dd>{formatDate(quote.fecha)}</dd></div>
      <div>
        <dt>Válida hasta</dt>
        <dd class:expired>{vence ? formatDate(vence.toISOString()) : '—'}{expired ? ' · vencida' : ''}</dd>
      </div>
      <div><dt>Asesor</dt><dd>{routesStore.asesorById.get(quote.asesorId)?.nombre ?? '—'}</dd></div>
      <div><dt>Contacto</dt><dd>{client?.contacto.nombre ?? '—'}</dd></div>
    </dl>

    <h3>Detalle</h3>
    <table>
      <thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Subtotal</th></tr></thead>
      <tbody>
        {#each quote.items as item, i (i)}
          <tr>
            <td>{item.producto}<small>{formatMoney(item.precio)} c/u</small></td>
            <td class="r">{item.cantidad}</td>
            <td class="r">{formatMoney(subtotal(item))}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if order}
      <p class="linked"><Icon name="package" size={14} /> Generó el pedido <strong>{order.numero}</strong></p>
    {/if}

    <div class="actions">
      {#if quote.estado === 'borrador'}
        <button class="btn btn-primary" disabled={busy} onclick={() => setStatus('enviada')}>Enviar al cliente</button>
      {:else if quote.estado === 'enviada' || quote.estado === 'en_revision'}
        <button class="btn btn-primary" disabled={busy} onclick={() => setStatus('aprobada')}>Marcar aprobada</button>
        <button class="btn btn-outline" disabled={busy} onclick={() => setStatus('rechazada')}>Marcar rechazada</button>
      {:else if quote.estado === 'aprobada' && !order}
        <button class="btn btn-primary" disabled={busy} onclick={toOrder}>
          <Icon name="package" size={16} /> Convertir en pedido
        </button>
      {/if}
      <button class="btn btn-outline" onclick={print}><Icon name="download" size={16} /> Imprimir / PDF</button>
    </div>
  {/if}
</Modal>

<style>
  .total {
    font: 800 30px/36px var(--font-heading);
  }

  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    margin: 18px 0 0;
  }

  dt {
    font-size: 11px;
    color: var(--text-muted);
  }

  dd {
    margin: 2px 0 0;
    font-weight: 500;
  }

  dd.expired {
    color: #b45309;
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

  .linked {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 16px;
    font-size: 13px;
    color: var(--text-brand);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }
</style>
