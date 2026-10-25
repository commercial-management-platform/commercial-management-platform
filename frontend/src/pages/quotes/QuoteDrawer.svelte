<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import ItemsEditor from '../../lib/components/ItemsEditor.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { subtotal } from '../../lib/domain/commerce'
  import { can } from '../../lib/permissions.svelte'
  import { router } from '../../lib/router.svelte'
  import { clientDisplayName } from '../../lib/services/clientsApi'
  import {
    QUOTE_DOCUMENT_ACCEPT,
    QUOTE_DOCUMENT_MAX_BYTES,
    QUOTE_DOCUMENT_TYPES,
    QUOTE_STATUS_LABELS,
    getQuote,
    getQuoteDocumentUrl,
    type ApiQuote,
    type ApiQuoteDetail,
    type QuoteStatus,
  } from '../../lib/services/quotesApi'
  import { businessToday } from '../../lib/services/visitsApi'
  import { advisors } from '../../lib/stores/advisors.svelte'
  import { clientDirectory, errorText } from '../../lib/stores/clientDirectory.svelte'
  import {
    attachQuoteDocument,
    createOrderFromQuote,
    ordersStore,
    saveQuoteItems,
    setQuoteStatus,
    toLineItem,
  } from '../../lib/stores/commerce.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { LineItem } from '../../lib/types'
  import { formatDate, formatMoney } from '../../lib/utils/format'
  import { printDocument } from '../../lib/utils/printDocument'
  import { quoteBadge } from './badges'

  let { quote, onclose }: { quote: ApiQuote | null; onclose: () => void } = $props()

  let busy = $state(false)
  let details = $state<ApiQuoteDetail[] | null>(null)
  let detailsError = $state('')
  let editing = $state(false)
  let draftItems = $state<(LineItem & { detailId?: number })[]>([])
  let converting = $state(false)
  let entrega = $state('')
  let uploading = $state(false)
  let fileInput = $state<HTMLInputElement>()

  let client = $derived(quote ? clientDirectory.byId.get(quote.clientId) : undefined)
  let contact = $derived(
    quote ? clientDirectory.contacts[quote.clientId]?.find((c) => c.isPrimary && c.active)?.name : undefined,
  )
  let order = $derived(quote ? ordersStore.items.find((o) => o.quoteId === quote.id) : undefined)
  let items = $derived((details ?? []).map(toLineItem))

  const day = (date: string) => `${date}T12:00:00`
  const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

  // Los productos no vienen en el listado: se piden al abrir (y si cambia el valor).
  let loadedKey = ''
  $effect(() => {
    if (!quote) {
      loadedKey = ''
      return
    }
    const key = `${quote.id}:${quote.updatedAt}`
    if (key === loadedKey) return
    const firstOpen = !loadedKey.startsWith(`${quote.id}:`)
    loadedKey = key
    if (firstOpen) {
      details = null
      editing = converting = false
      clientDirectory.loadContacts(quote.clientId).catch(() => {})
    }
    detailsError = ''
    const id = quote.id
    getQuote(id)
      .then((full) => quote?.id === id && (details = full.details))
      .catch((e) => (detailsError = errorText(e, 'No pudimos cargar los productos.')))
  })

  async function run(action: () => Promise<unknown>) {
    busy = true
    try {
      await action()
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo guardar', message: errorText(e, 'Intenta de nuevo.') })
    } finally {
      busy = false
    }
  }

  const setStatus = (status: QuoteStatus) => run(() => setQuoteStatus(quote!.id, status))

  function startEditing() {
    draftItems = items.length ? $state.snapshot(items) : [{ producto: '', cantidad: 1, precio: 0 }]
    editing = true
  }

  let validDraft = $derived(draftItems.length > 0 && draftItems.every((i) => i.producto.trim() && i.cantidad > 0 && i.precio >= 0))

  function saveItems() {
    if (!quote || !details || !validDraft) return
    const id = quote.id
    const before = details
    run(async () => {
      const updated = await saveQuoteItems(id, before, $state.snapshot(draftItems))
      details = updated.details
      editing = false
      toasts.push({ tone: 'success', icon: 'check', title: 'Productos guardados', message: updated.number })
    })
  }

  function startConverting() {
    entrega = addDays(businessToday(), 5)
    converting = true
  }

  function toOrder() {
    if (!quote || !entrega) return
    const source = quote
    run(async () => {
      const created = await createOrderFromQuote(source.id, { date: businessToday(), estimatedDeliveryDate: entrega })
      toasts.push({ tone: 'success', icon: 'package', title: 'Pedido creado', message: `${created.number} desde ${source.number}` })
      onclose()
      router.go('pedidos', { nuevo: String(created.id) })
    })
  }

  // Documento en S3 (HU-12 CA-08 y CA-09): el backend valida de nuevo tipo y tamaño.
  async function attach(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!quote || !file) return
    if (!QUOTE_DOCUMENT_TYPES.includes(file.type)) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'Archivo no permitido', message: 'Solo PDF, JPG o PNG.' })
      return
    }
    if (file.size > QUOTE_DOCUMENT_MAX_BYTES) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'Archivo muy pesado', message: 'El máximo es 5 MB.' })
      return
    }
    const replacing = !!quote.documentKey
    const id = quote.id
    uploading = true
    try {
      const updated = await attachQuoteDocument(id, file)
      toasts.push({ tone: 'success', icon: 'check', title: replacing ? 'Documento reemplazado' : 'Documento adjuntado', message: updated.number })
    } catch (e) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo adjuntar', message: errorText(e, 'Intenta de nuevo.') })
    } finally {
      uploading = false
    }
  }

  async function viewDocument() {
    if (!quote) return
    // La ventana se abre antes de pedir la URL para que el navegador no la bloquee.
    const win = window.open('', '_blank')
    try {
      const { url } = await getQuoteDocumentUrl(quote.id)
      if (win) {
        win.opener = null
        win.location.href = url
      } else {
        window.location.assign(url)
      }
    } catch (e) {
      win?.close()
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo abrir el documento', message: errorText(e, 'Intenta de nuevo.') })
    }
  }

  function print() {
    if (!quote) return
    const ok = printDocument({
      tipo: 'Cotización',
      numero: quote.number,
      fecha: day(quote.date),
      cliente: {
        nombre: client?.businessName ?? `Cliente #${quote.clientId}`,
        nit: client?.nit ?? '—',
        direccion: client?.address ?? '',
        municipio: client?.municipality ?? '',
        contacto: contact ?? '',
      },
      items,
      meta: [
        ['Asesor', advisors.name(quote.advisorId)],
        ['Moneda', quote.currency],
        ['Estado', QUOTE_STATUS_LABELS[quote.status]],
      ],
      moneda: quote.currency,
      marcaAgua: quote.status === 'draft' ? 'Borrador' : quote.status === 'rejected' ? 'Rechazada' : undefined,
    })
    if (!ok) toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'Ventana bloqueada', message: 'Permite las ventanas emergentes para imprimir.' })
  }
</script>

<Modal
  open={!!quote}
  {onclose}
  variant="drawer"
  title={quote?.number ?? ''}
  subtitle={client ? clientDisplayName(client) : quote ? `Cliente #${quote.clientId}` : ''}
>
  {#snippet badge()}
    {#if quote}<span class="badge {quoteBadge[quote.status]}">{QUOTE_STATUS_LABELS[quote.status]}</span>{/if}
  {/snippet}

  {#if quote}
    <p class="total">{formatMoney(Number(quote.value))} <small>{quote.currency}</small></p>

    <dl>
      <div><dt>Fecha</dt><dd>{formatDate(day(quote.date))}</dd></div>
      <div><dt>Asesor</dt><dd>{advisors.name(quote.advisorId)}</dd></div>
      <div><dt>NIT</dt><dd>{client?.nit ?? '—'}</dd></div>
      <div><dt>Contacto</dt><dd>{contact ?? '—'}</dd></div>
    </dl>

    <h3>Detalle</h3>
    {#if editing}
      <ItemsEditor bind:items={draftItems} invalid={!validDraft} />
      <div class="actions">
        <button class="btn btn-primary" disabled={busy || !validDraft} onclick={saveItems}>
          {busy ? 'Guardando…' : 'Guardar productos'}
        </button>
        <button class="btn btn-outline" disabled={busy} onclick={() => (editing = false)}>Cancelar</button>
      </div>
    {:else if detailsError}
      <p class="muted">{detailsError}</p>
    {:else if details === null}
      <p class="muted">Cargando productos…</p>
    {:else}
      <table>
        <thead><tr><th>Producto</th><th class="r">Cant.</th><th class="r">Subtotal</th></tr></thead>
        <tbody>
          {#each items as item (item.detailId)}
            <tr>
              <td>{item.producto}<small>{formatMoney(item.precio)} c/u</small></td>
              <td class="r">{item.cantidad}</td>
              <td class="r">{formatMoney(subtotal(item))}</td>
            </tr>
          {:else}
            <tr><td colspan="3" class="muted">Sin productos todavía.</td></tr>
          {/each}
        </tbody>
      </table>
    {/if}

    {#if order}
      <p class="linked"><Icon name="package" size={14} /> Generó el pedido <strong>{order.number}</strong></p>
    {/if}

    <h3>Documento</h3>
    <div class="document">
      <span class="doc-state" class:attached={!!quote.documentKey}>
        <Icon name="file-text" size={16} />
        {quote.documentKey ? 'Documento adjunto' : 'Sin documento adjunto'}
      </span>
      <div class="doc-actions">
        {#if quote.documentKey}
          <button class="btn btn-outline" disabled={uploading} onclick={viewDocument}>
            <Icon name="eye" size={16} /> Ver
          </button>
        {/if}
        <button class="btn btn-outline" disabled={uploading} onclick={() => fileInput?.click()}>
          <Icon name="upload" size={16} />
          {uploading ? 'Subiendo…' : quote.documentKey ? 'Reemplazar' : 'Adjuntar'}
        </button>
        <input bind:this={fileInput} type="file" accept={QUOTE_DOCUMENT_ACCEPT} onchange={attach} hidden />
      </div>
    </div>
    <p class="muted hint">PDF, JPG o PNG de hasta 5 MB.</p>

    {#if converting}
      <div class="convert">
        <label class="field">
          <span>Entrega estimada</span>
          <input class="input" type="date" min={businessToday()} bind:value={entrega} />
        </label>
        <button class="btn btn-primary" disabled={busy || !entrega} onclick={toOrder}>
          <Icon name="package" size={16} /> Crear pedido
        </button>
        <button class="btn btn-outline" disabled={busy} onclick={() => (converting = false)}>Cancelar</button>
      </div>
    {:else if !editing}
      <div class="actions">
        {#if quote.status === 'draft'}
          <button class="btn btn-outline" disabled={busy || details === null} onclick={startEditing}>
            <Icon name="pencil" size={16} /> Editar productos
          </button>
          {#if can.isManager}
            <button class="btn btn-primary" disabled={busy || !items.length} onclick={() => setStatus('sent')}>Enviar al cliente</button>
          {/if}
        {:else if quote.status === 'sent' && can.isManager}
          <button class="btn btn-primary" disabled={busy} onclick={() => setStatus('approved')}>Marcar aprobada</button>
          <button class="btn btn-outline" disabled={busy} onclick={() => setStatus('rejected')}>Marcar rechazada</button>
        {:else if quote.status === 'approved' && !order}
          <button class="btn btn-primary" disabled={busy} onclick={startConverting}>
            <Icon name="package" size={16} /> Convertir en pedido
          </button>
        {/if}
        <button class="btn btn-outline" onclick={print} disabled={details === null}>
          <Icon name="download" size={16} /> Imprimir / PDF
        </button>
      </div>
      {#if quote.status === 'draft' && !can.isManager}
        <p class="muted hint">El gestor revisa y envía la cotización al cliente.</p>
      {/if}
    {/if}
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

  .total small {
    font: 600 13px var(--font-heading);
    color: var(--text-muted);
  }

  .muted {
    font-size: 13px;
    color: var(--text-muted);
  }

  .hint {
    margin-top: 10px;
  }

  .convert {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px;
    margin-top: 24px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font: 600 12px/18px var(--font-heading);
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

  .document {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .doc-state {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .doc-state.attached {
    color: var(--text-brand);
  }

  .doc-actions {
    display: flex;
    gap: 8px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }
</style>
