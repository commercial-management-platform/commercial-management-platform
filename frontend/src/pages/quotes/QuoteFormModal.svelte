<script lang="ts">
  import ItemsEditor from '../../lib/components/ItemsEditor.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { can } from '../../lib/permissions.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import type { ApiQuote } from '../../lib/services/quotesApi'
  import { businessToday } from '../../lib/services/visitsApi'
  import { advisors } from '../../lib/stores/advisors.svelte'
  import { clientDirectory } from '../../lib/stores/clientDirectory.svelte'
  import { PartialQuoteError, createQuoteWithItems } from '../../lib/stores/commerce.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { LineItem } from '../../lib/types'

  // Nueva cotización (HU-12). El asesor la crea a su nombre y solo en borrador;
  // el gestor elige el asesor y puede enviarla de una vez.

  interface Props {
    open: boolean
    onclose: () => void
    oncreated?: (quote: ApiQuote) => void
  }

  let { open, onclose, oncreated }: Props = $props()

  let clientId = $state<number | ''>('')
  let advisorId = $state<number | ''>('')
  let date = $state(businessToday())
  let items = $state<LineItem[]>([])
  let showErrors = $state(false)
  let saving = $state(false)

  // El asesor solo recibe los clientes de sus rutas.
  let clients = $derived(
    clientDirectory.clients.filter((c) => c.active).toSorted((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b))),
  )

  $effect(() => {
    if (!open) return
    clientId = ''
    advisorId = ''
    date = businessToday()
    items = [{ producto: '', cantidad: 1, precio: 0 }]
    showErrors = false
  })

  let validItems = $derived(items.length > 0 && items.every((i) => i.producto.trim() && i.cantidad > 0 && i.precio >= 0))
  let valid = $derived(clientId !== '' && !!date && (!can.isManager || advisorId !== '') && validItems)

  async function save(send: boolean) {
    showErrors = true
    if (!valid || clientId === '') return
    saving = true
    try {
      const quote = await createQuoteWithItems({
        clientId,
        date,
        advisorId: can.isManager && advisorId !== '' ? advisorId : undefined,
        items: $state.snapshot(items),
        send,
      })
      toasts.push({ tone: 'success', icon: 'file-text', title: send ? 'Cotización enviada' : 'Borrador guardado', message: quote.number })
      oncreated?.(quote)
      onclose()
    } catch (error) {
      if (error instanceof PartialQuoteError) {
        // Ya existe: se abre su detalle para completarla.
        toasts.push({
          tone: 'warning',
          icon: 'alert-circle',
          title: 'Cotización incompleta',
          message: `${error.quote.number} quedó en borrador: ${error.message}`,
        })
        oncreated?.(error.quote)
        onclose()
        return
      }
      toasts.push({
        tone: 'warning',
        icon: 'alert-circle',
        title: 'No se pudo crear la cotización',
        message: error instanceof Error && error.message ? error.message : 'Intenta de nuevo.',
      })
    } finally {
      saving = false
    }
  }
</script>

<Modal {open} {onclose} size="lg" title="Nueva cotización" subtitle="Arma la propuesta con los productos para el cliente.">
  <div class="form">
    <label class="field span-2">
      <span>Cliente *</span>
      <select class="select" class:invalid={showErrors && clientId === ''} bind:value={clientId}>
        <option value="" disabled>Selecciona un cliente</option>
        {#each clients as c (c.id)}
          <option value={c.id}>{clientDisplayName(c)}{c.municipality ? ` · ${c.municipality}` : ''}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span>Fecha *</span>
      <input class="input" class:invalid={showErrors && !date} type="date" bind:value={date} />
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
    <div class="field span-3">
      <span>Detalle</span>
      <ItemsEditor bind:items invalid={showErrors && !validItems} />
    </div>
  </div>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    {#if can.isManager}
      <button class="btn btn-outline" type="button" disabled={saving} onclick={() => save(false)}>Guardar borrador</button>
      <button class="btn btn-primary" type="button" disabled={saving} onclick={() => save(true)}>
        {saving ? 'Guardando…' : 'Enviar cotización'}
      </button>
    {:else}
      <!-- Enviar es del gestor: el asesor deja el borrador listo para revisión. -->
      <button class="btn btn-primary" type="button" disabled={saving} onclick={() => save(false)}>
        {saving ? 'Guardando…' : 'Guardar borrador'}
      </button>
    {/if}
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
