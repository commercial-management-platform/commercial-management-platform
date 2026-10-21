import { subtotal, total } from '../domain/commerce'
import type { LineItem } from '../types'
import { formatDate, formatMoney } from './format'

interface PrintableDocument {
  tipo: 'Cotización' | 'Pedido'
  numero: string
  fecha: string
  cliente: { nombre: string; nit: string; direccion: string; municipio: string; contacto: string }
  items: LineItem[]
  /** Pares etiqueta / valor extra (vigencia, estado, entrega…). */
  meta: [string, string][]
}

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/**
 * Abre el documento en una ventana lista para imprimir o guardar como PDF.
 * Cuando exista backend, el PDF real se generará allá y se guardará en S3.
 */
export function printDocument(doc: PrintableDocument) {
  const rows = doc.items
    .map(
      (item) =>
        `<tr><td>${escape(item.producto)}</td><td class="r">${item.cantidad}</td><td class="r">${formatMoney(item.precio)}</td><td class="r">${formatMoney(subtotal(item))}</td></tr>`,
    )
    .join('')
  const meta = doc.meta.map(([k, v]) => `<div><span>${escape(k)}</span><strong>${escape(v)}</strong></div>`).join('')

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${doc.tipo} ${doc.numero}</title>
<style>
  body{font:14px/1.5 'DM Sans',system-ui,sans-serif;color:#0f172a;margin:48px}
  header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #047857;padding-bottom:16px}
  h1{font:800 26px Manrope,system-ui,sans-serif;margin:0}
  .brand{font:800 20px Manrope,system-ui,sans-serif;color:#047857}
  .muted{color:#64748b}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:24px 0}
  .meta div{display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:4px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;background:#f8fafc}
  th,td{padding:10px 12px;border-bottom:1px solid #e2e8f0}
  .r{text-align:right}
  tfoot td{font:800 16px Manrope,system-ui,sans-serif;border:0}
  footer{margin-top:48px;font-size:12px;color:#94a3b8}
</style></head><body>
<header><div><div class="brand">Kestrel</div><div class="muted">Gestión comercial</div></div>
<div style="text-align:right"><h1>${doc.tipo} ${escape(doc.numero)}</h1><div class="muted">${formatDate(doc.fecha)}</div></div></header>
<div class="grid">
  <div><strong>${escape(doc.cliente.nombre)}</strong><div class="muted">NIT ${escape(doc.cliente.nit)}</div>
  <div>${escape(doc.cliente.direccion)}, ${escape(doc.cliente.municipio)}</div><div>Atención: ${escape(doc.cliente.contacto)}</div></div>
  <div class="meta">${meta}</div>
</div>
<table><thead><tr><th>Producto</th><th class="r">Cantidad</th><th class="r">Precio</th><th class="r">Subtotal</th></tr></thead>
<tbody>${rows}</tbody><tfoot><tr><td colspan="3" class="r">Total</td><td class="r">${formatMoney(total(doc.items))}</td></tr></tfoot></table>
<footer>Documento generado por Kestrel. Valores en USD.</footer>
<script>window.onload = () => window.print()<\/script>
</body></html>`

  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  return true
}
