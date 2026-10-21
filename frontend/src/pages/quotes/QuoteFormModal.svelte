<script lang="ts">
  import ItemsEditor from '../../lib/components/ItemsEditor.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { PRODUCTOS, VIGENCIAS } from '../../lib/domain/commerce'
  import { clientsStore } from '../../lib/stores/clients.svelte'
  import { createQuote } from '../../lib/stores/commerce.svelte'
  import { routesStore } from '../../lib/stores/routes.svelte'
  import { session } from '../../lib/stores/session.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { LineItem, Quote } from '../../lib/types'

  interface Props {
    open: boolean
    onclose: () => void
    oncreated?: (quote: Quote) => void
  }

  let { open, onclose, oncreated }: Props = $props()

  let clientId = $state('')
  let asesorId = $state('')
  let vigenciaDias = $state(15)
  let items = $state<LineItem[]>([])
  let showErrors = $state(false)
  let saving = $state(false)

  let clients = $derived(clientsStore.clients.filter((c) => c.estado !== 'inactivo').toSorted((a, b) => a.nombre.localeCompare(b.nombre)))

  $effect(() => {
    if (!open) return
    clientId = ''
    // Por defecto, el asesor con sesión iniciada.
    asesorId = routesStore.asesores.find((a) => a.nombre === session.current?.user.name)?.id ?? ''
    vigenciaDias = 15
    items = [{ producto: PRODUCTOS[0].nombre, cantidad: 1, precio: PRODUCTOS[0].precio }]
    showErrors = false
  })

  let validItems = $derived(items.length > 0 && items.every((i) => i.cantidad > 0 && i.precio >= 0))
  let valid = $derived(!!clientId && !!asesorId && validItems)

  async function save(estado: 'borrador' | 'enviada') {
    showErrors = true
    if (!valid) return
    saving = true
    try {
      const quote = await createQuote({ clientId, asesorId, vigenciaDias, items, estado })
      oncreated?.(quote)
      onclose()
    } catch {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo crear la cotización', message: 'Intenta de nuevo.' })
    } finally {
      saving = false
    }
  }
</script>

<Modal {open} {onclose} size="lg" title="Nueva cotización" subtitle="Arma la propuesta con los productos del portafolio.">
  <div class="form">
    <label class="field span-2">
      <span>Cliente *</span>
      <select class="select" class:invalid={showErrors && !clientId} bind:value={clientId}>
        <option value="" disabled>Selecciona un cliente</option>
        {#each clients as c (c.id)}<option value={c.id}>{c.nombre} · {c.municipio}</option>{/each}
      </select>
    </label>
    <label class="field">
      <span>Vigencia</span>
      <select class="select" bind:value={vigenciaDias}>
        {#each VIGENCIAS as v (v)}<option value={v}>{v} días</option>{/each}
      </select>
    </label>
    <label class="field span-3">
      <span>Asesor *</span>
      <select class="select" class:invalid={showErrors && !asesorId} bind:value={asesorId}>
        <option value="" disabled>Selecciona un asesor</option>
        {#each routesStore.asesores as a (a.id)}<option value={a.id}>{a.nombre}</option>{/each}
      </select>
    </label>
    <div class="field span-3">
      <span>Detalle</span>
      <ItemsEditor bind:items invalid={showErrors && !validItems} />
    </div>
  </div>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-outline" type="button" disabled={saving} onclick={() => save('borrador')}>Guardar borrador</button>
    <button class="btn btn-primary" type="button" disabled={saving} onclick={() => save('enviada')}>
      {saving ? 'Guardando…' : 'Enviar cotización'}
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

  .select {
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
