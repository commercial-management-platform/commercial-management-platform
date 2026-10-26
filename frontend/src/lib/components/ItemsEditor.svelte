<script lang="ts">
  import { PRODUCTOS, subtotal, total } from '../domain/commerce'
  import type { LineItem } from '../types'
  import { formatMoney } from '../utils/format'
  import Icon from './Icon.svelte'

  /**
   * Detalle de productos (quote_detail): producto, cantidad, precio y subtotal.
   * El producto es texto libre; PRODUCTOS solo sugiere nombres y precios de lista.
   */
  let { items = $bindable(), invalid = false }: { items: LineItem[]; invalid?: boolean } = $props()

  const listId = `productos-${Math.random().toString(36).slice(2, 8)}`

  function add() {
    const used = new Set(items.map((i) => i.producto))
    const next = PRODUCTOS.find((p) => !used.has(p.nombre)) ?? PRODUCTOS[0]
    items.push({ producto: next.nombre, cantidad: 1, precio: next.precio })
  }

  /** Al elegir un producto sugerido se propone su precio de lista. */
  function pickProduct(item: LineItem, nombre: string) {
    item.producto = nombre
    const product = PRODUCTOS.find((p) => p.nombre === nombre)
    if (product) item.precio = product.precio
  }

</script>

<div class="editor" class:invalid>
  <div class="head">
    <span>Producto</span>
    <span>Cantidad</span>
    <span>Precio</span>
    <span class="right">Subtotal</span>
    <span></span>
  </div>

  {#each items as item, i (i)}
    <div class="row">
      <input
        class="input"
        list={listId}
        value={item.producto}
        oninput={(e) => pickProduct(item, e.currentTarget.value)}
        maxlength="255"
        placeholder="Producto"
        aria-label="Producto"
      />
      <input class="input" type="number" min="0.01" step="any" bind:value={item.cantidad} aria-label="Cantidad" />
      <input class="input" type="number" min="0" step="any" bind:value={item.precio} aria-label="Precio unitario" />
      <span class="right num">{formatMoney(subtotal(item) || 0)}</span>
      <button type="button" class="remove" onclick={() => items.splice(i, 1)} aria-label="Quitar línea">
        <Icon name="trash" size={16} />
      </button>
    </div>
  {:else}
    <p class="empty">Agrega al menos un producto.</p>
  {/each}

  <datalist id={listId}>
    {#each PRODUCTOS as p (p.nombre)}<option value={p.nombre}></option>{/each}
  </datalist>

  <div class="foot">
    <button type="button" class="btn btn-soft" onclick={add}>
      <Icon name="plus" size={14} strokeWidth={2.2} /> Agregar producto
    </button>
    <p>Total <strong>{formatMoney(total(items) || 0)}</strong></p>
  </div>
</div>

<style>
  .editor {
    border: 1px solid var(--border-default);
    border-radius: 12px;
    overflow: hidden;
  }

  .editor.invalid {
    border-color: var(--danger);
  }

  .head,
  .row {
    display: grid;
    grid-template-columns: minmax(0, 2.4fr) 80px 100px 100px 32px;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
  }

  .head {
    font: 600 11px/16px var(--font-heading);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
    background: var(--bg-surface-soft);
  }

  .row + .row {
    border-top: 1px solid var(--border-default);
  }

  .row .input {
    width: 100%;
    height: 36px;
    min-width: 0;
    font-size: 13px;
  }

  .right {
    text-align: right;
  }

  .num {
    font-variant-numeric: tabular-nums;
  }

  .remove {
    display: grid;
    place-items: center;
    padding: 6px;
    color: var(--danger);
    border: 0;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  }

  .remove:hover {
    background: var(--danger-bg);
  }

  .empty {
    padding: 16px 12px;
    font-size: 13px;
    color: var(--text-muted);
  }

  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-top: 1px solid var(--border-default);
    background: var(--bg-surface-soft);
  }

  .foot .btn {
    height: 34px;
    padding: 0 12px;
    font-size: 13px;
  }

  .foot strong {
    margin-left: 8px;
    font: 800 16px var(--font-heading);
    color: var(--text-primary);
  }

  @media (max-width: 560px) {
    .head {
      display: none;
    }

    .row {
      grid-template-columns: 1fr 1fr 32px;
    }

    .row .input:first-child {
      grid-column: 1 / -1;
    }

    .row .num {
      display: none;
    }
  }
</style>
