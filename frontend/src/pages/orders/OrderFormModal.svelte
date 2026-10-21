<script lang="ts">
  import ItemsEditor from '../../lib/components/ItemsEditor.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { PRODUCTOS } from '../../lib/domain/commerce'
  import { clientsStore } from '../../lib/stores/clients.svelte'
  import { createOrder, ordersStore, quotesStore } from '../../lib/stores/commerce.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { LineItem, Order } from '../../lib/types'
  import { formatMoney } from '../../lib/utils/format'

  interface Props {
    open: boolean
    onclose: () => void
    oncreated?: (order: Order) => void
  }

  let { open, onclose, oncreated }: Props = $props()

  const isoDate = (offsetDays: number) => {
    const d = new Date(Date.now() + offsetDays * 86_400_000)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }

  let quoteId = $state('')
  let clientId = $state('')
  let entrega = $state(isoDate(5))
  let items = $state<LineItem[]>([])
  let showErrors = $state(false)
  let saving = $state(false)

  let clients = $derived(clientsStore.clients.filter((c) => c.estado !== 'inactivo').toSorted((a, b) => a.nombre.localeCompare(b.nombre)))

  // Cotizaciones aprobadas que aún no tienen pedido.
  let approved = $derived(
    quotesStore.items.filter((q) => q.estado === 'aprobada' && !ordersStore.items.some((o) => o.quoteId === q.id)),
  )

  $effect(() => {
    if (!open) return
    quoteId = ''
    clientId = ''
    entrega = isoDate(5)
    items = [{ producto: PRODUCTOS[0].nombre, cantidad: 1, precio: PRODUCTOS[0].precio }]
    showErrors = false
  })

  function pickQuote(id: string) {
    quoteId = id
    const quote = quotesStore.byId.get(id)
    if (quote) {
      clientId = quote.clientId
      items = $state.snapshot(quote.items)
    }
  }

  let validItems = $derived(items.length > 0 && items.every((i) => i.cantidad > 0 && i.precio >= 0))
  let validDate = $derived(!!entrega && entrega >= isoDate(0))

  async function save() {
    showErrors = true
    if (!clientId || !validItems || !validDate) return
    saving = true
    try {
      const order = await createOrder({
        clientId,
        entrega: new Date(`${entrega}T14:00`).toISOString(),
        items,
        quoteId: quoteId || undefined,
      })
      oncreated?.(order)
      onclose()
    } catch {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo crear el pedido', message: 'Intenta de nuevo.' })
    } finally {
      saving = false
    }
  }
</script>

<Modal {open} {onclose} size="lg" title="Nuevo pedido" subtitle="Créalo desde una cotización aprobada o directamente.">
  <div class="form">
    <label class="field span-3">
      <span>Desde cotización</span>
      <select class="select" value={quoteId} onchange={(e) => pickQuote(e.currentTarget.value)}>
        <option value="">Sin cotización (pedido directo)</option>
        {#each approved as q (q.id)}
          <option value={q.id}>{q.numero} · {q.cliente} · {formatMoney(q.valor)}</option>
        {/each}
      </select>
    </label>
    <label class="field span-2">
      <span>Cliente *</span>
      <select class="select" class:invalid={showErrors && !clientId} bind:value={clientId} disabled={!!quoteId}>
        <option value="" disabled>Selecciona un cliente</option>
        {#each clients as c (c.id)}<option value={c.id}>{c.nombre} · {c.municipio}</option>{/each}
      </select>
    </label>
    <label class="field">
      <span>Entrega estimada *</span>
      <input class="input" class:invalid={showErrors && !validDate} type="date" min={isoDate(0)} bind:value={entrega} />
    </label>
    <div class="field span-3">
      <span>Detalle</span>
      <ItemsEditor bind:items invalid={showErrors && !validItems} />
    </div>
  </div>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="button" disabled={saving} onclick={save}>
      {saving ? 'Creando…' : 'Crear pedido'}
    </button>
  {/snippet}
</Modal>

<style>
  .form {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .field > span {
    font: 600 12px/18px var(--font-heading);
  }

  .span-2 {
    grid-column: span 2;
  }

  .span-3 {
    grid-column: 1 / -1;
  }

  .select,
  .input {
    width: 100%;
  }

  .invalid {
    border-color: var(--danger);
  }

  @media (max-width: 600px) {
    .form {
      grid-template-columns: 1fr;
    }

    .span-2 {
      grid-column: auto;
    }
  }
</style>
