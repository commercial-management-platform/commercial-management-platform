<script lang="ts">
  import { untrack } from 'svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { can } from '../../lib/permissions.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import { toDecimal } from '../../lib/services/quotesApi'
  import type { ApiSalesOrder } from '../../lib/services/salesOrdersApi'
  import { businessToday } from '../../lib/services/visitsApi'
  import { advisors } from '../../lib/stores/advisors.svelte'
  import { clientDirectory } from '../../lib/stores/clientDirectory.svelte'
  import { createOrder, createOrderFromQuote, ordersStore, quotesStore, type VisitOrigin } from '../../lib/stores/commerce.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatMoney } from '../../lib/utils/format'

  // Nuevo pedido (HU-14): desde una cotización aprobada (copia cliente, asesor y
  // valor) o directo. El backend guarda el valor total, no líneas de producto.
  // Si viene de una visita, el cliente queda fijo y el pedido se vincula a ella (HU-14 CA-04).

  interface Props {
    open: boolean
    onclose: () => void
    oncreated?: (order: ApiSalesOrder) => void
    fromVisit?: VisitOrigin | null
  }

  let { open, onclose, oncreated, fromVisit = null }: Props = $props()

  const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

  let quoteId = $state<number | ''>('')
  let clientId = $state<number | ''>('')
  let advisorId = $state<number | ''>('')
  let value = $state<number | null>(null)
  let date = $state(businessToday())
  let entrega = $state('')
  let showErrors = $state(false)
  let saving = $state(false)

  let clients = $derived(
    clientDirectory.clients.filter((c) => c.active).toSorted((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b))),
  )
  const clientName = (id: number) => {
    const client = clientDirectory.byId.get(id)
    return client ? clientDisplayName(client) : `Cliente #${id}`
  }

  // Cotizaciones aprobadas que aún no tienen pedido.
  let approved = $derived(
    quotesStore.items.filter(
      (q) =>
        q.status === 'approved' &&
        (!fromVisit || q.clientId === fromVisit.clientId) &&
        !ordersStore.items.some((o) => o.quoteId === q.id),
    ),
  )
  let quote = $derived(quoteId === '' ? null : (quotesStore.byId.get(quoteId) ?? null))

  $effect(() => {
    if (!open) return
    quoteId = ''
    clientId = fromVisit?.clientId ?? ''
    advisorId = fromVisit?.advisorId ?? ''
    // Desde una visita la pantalla de pedidos no está abierta: se cargan las cotizaciones aprobadas.
    if (fromVisit) {
      untrack(() => {
        if (quotesStore.status === 'idle') quotesStore.refresh()
        if (ordersStore.status === 'idle') ordersStore.refresh()
      })
    }
    value = null
    date = businessToday()
    entrega = addDays(date, 5)
    showErrors = false
  })

  let validDates = $derived(!!date && !!entrega && entrega >= date)
  let validDirect = $derived(clientId !== '' && (!can.isManager || advisorId !== '') && value !== null && value >= 0)
  let valid = $derived(validDates && (quote !== null || validDirect))

  async function save() {
    showErrors = true
    if (!valid) return
    saving = true
    try {
      const order = quote
        ? await createOrderFromQuote(quote.id, { date, estimatedDeliveryDate: entrega, visitId: fromVisit?.visitId })
        : await createOrder({
            clientId: Number(clientId),
            date,
            value: toDecimal(value ?? 0),
            estimatedDeliveryDate: entrega,
            advisorId: can.isManager && advisorId !== '' ? advisorId : undefined,
            visitId: fromVisit?.visitId,
          })
      toasts.push({ tone: 'success', icon: 'package', title: 'Pedido creado', message: order.number })
      oncreated?.(order)
      onclose()
    } catch (error) {
      toasts.push({
        tone: 'warning',
        icon: 'alert-circle',
        title: 'No se pudo crear el pedido',
        message: error instanceof Error && error.message ? error.message : 'Intenta de nuevo.',
      })
    } finally {
      saving = false
    }
  }
</script>

<Modal {open} {onclose} size="lg" title="Nuevo pedido" subtitle="Créalo desde una cotización aprobada o directamente.">
  <div class="form">
    <label class="field span-3">
      <span>Desde cotización</span>
      <select class="select" bind:value={quoteId}>
        <option value="">Sin cotización (pedido directo)</option>
        {#each approved as q (q.id)}
          <option value={q.id}>{q.number} · {clientName(q.clientId)} · {formatMoney(Number(q.value))}</option>
        {/each}
      </select>
    </label>

    {#if quote}
      <p class="span-3 from-quote">
        Cliente <strong>{clientName(quote.clientId)}</strong> · asesor <strong>{advisors.name(quote.advisorId)}</strong> ·
        valor <strong>{formatMoney(Number(quote.value))}</strong>, tomados de la cotización.
      </p>
    {:else}
      {#if fromVisit}
        <div class="field span-2">
          <span>Cliente</span>
          <p class="fixed">{fromVisit.clientName}<small>Vinculado a la visita registrada</small></p>
        </div>
      {:else}
        <label class="field span-2">
          <span>Cliente *</span>
          <select class="select" class:invalid={showErrors && clientId === ''} bind:value={clientId}>
            <option value="" disabled>Selecciona un cliente</option>
            {#each clients as c (c.id)}
              <option value={c.id}>{clientDisplayName(c)}{c.municipality ? ` · ${c.municipality}` : ''}</option>
            {/each}
          </select>
        </label>
      {/if}
      <label class="field">
        <span>Valor total *</span>
        <input
          class="input"
          class:invalid={showErrors && (value === null || value < 0)}
          type="number"
          min="0"
          step="any"
          bind:value
          placeholder="0"
        />
      </label>
      {#if can.isManager}
        <label class="field span-3">
          <span>Asesor *</span>
          <select class="select" class:invalid={showErrors && advisorId === ''} bind:value={advisorId}>
            <option value="" disabled>Selecciona un asesor</option>
            {#each advisors.active as a (a.id)}<option value={a.id}>{a.name}</option>{/each}
          </select>
        </label>
      {/if}
    {/if}

    <label class="field">
      <span>Fecha del pedido *</span>
      <input class="input" class:invalid={showErrors && !date} type="date" bind:value={date} />
    </label>
    <label class="field">
      <span>Entrega estimada *</span>
      <input class="input" class:invalid={showErrors && !validDates} type="date" min={date} bind:value={entrega} />
    </label>
    {#if showErrors && !validDates}
      <p class="span-3 error">La entrega no puede ser anterior a la fecha del pedido.</p>
    {/if}
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

  .fixed {
    margin: 0;
    font-weight: 600;
  }

  .fixed small {
    display: block;
    font-weight: 400;
    font-size: 12px;
    color: var(--text-muted);
  }

  .from-quote {
    padding: 12px 14px;
    font-size: 13px;
    border-radius: 10px;
    background: var(--brand-50);
  }

  .error {
    font-size: 13px;
    color: var(--danger);
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
