import logoColumn from '../../assets/logo colum.webp'
import { subtotal, total } from '../domain/commerce'
import type { LineItem } from '../types'

interface PrintableDocument {
  tipo: 'Cotización' | 'Pedido'
  numero: string
  fecha: string
  cliente: { nombre: string; nit: string; direccion: string; municipio: string; contacto: string }
  items: LineItem[]
  /** Pares etiqueta / valor extra (asesor, estado, entrega…). */
  meta: [string, string][]
  /** Código ISO 4217; por defecto pesos colombianos. */
  moneda?: string
  /** Texto en diagonal de fondo, p. ej. "Borrador" mientras no se ha enviado. */
  marcaAgua?: string
}

/** Logo horizontal (símbolo + nombre); absoluto porque la ventana es about:blank. */
const logoUrl = () => new URL(logoColumn, location.href).href
/**
 * La imagen trae márgenes blancos amplios: se recorta con CSS al área del logo
 * (x 200–1210, y 180–520 de una imagen de 1407 × 768 px).
 */
const LOGO_CROP = { width: 1010, height: 340, left: 200, top: 180, imageWidth: 1407 }

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

const longDate = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
const quantity = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 })

// --- Código único y código de barras SIMULADOS -------------------------------
// Imitan la representación gráfica de los documentos electrónicos de la DIAN
// (CUDE de 96 caracteres hexadecimales y un código gráfico), pero no son
// válidos: el documento lo dice explícitamente.

/** Hash determinístico no criptográfico (cyrb53 encadenado) en `length` caracteres hex. */
function hexDigest(text: string, length: number): string {
  let out = ''
  for (let seed = 0; out.length < length; seed++) {
    let h1 = 0xdeadbeef ^ seed
    let h2 = 0x41c6ce57 ^ seed
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i)
      h1 = Math.imul(h1 ^ c, 2654435761)
      h2 = Math.imul(h2 ^ c, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    out += (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
  }
  return out.slice(0, length)
}

const BAR_MODULE = 1.6
const BAR_HEIGHT = 54
/** Barras de inicio y fin (ancho en módulos, alternando barra y espacio). */
const GUARD_START = [2, 1, 1, 2, 1, 1]
const GUARD_END = [2, 1, 1, 1, 3]

/** Código de barras SVG: cada dígito hex del código da el ancho de una barra y su espacio. */
function barcodeSvg(code: string): string {
  const widths = [...GUARD_START]
  for (const char of code.slice(0, 44)) {
    const n = Number.parseInt(char, 16)
    widths.push(1 + (n % 3), 1 + ((n >> 2) % 2))
  }
  widths.push(...GUARD_END)

  let x = 0
  const bars: string[] = []
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push(`<rect x="${(x * BAR_MODULE).toFixed(1)}" width="${(w * BAR_MODULE).toFixed(1)}" height="${BAR_HEIGHT}"/>`)
    x += w
  })
  const width = (x * BAR_MODULE).toFixed(1)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BAR_HEIGHT}" viewBox="0 0 ${width} ${BAR_HEIGHT}" fill="#0f172a" role="img" aria-label="Código de barras simulado">${bars.join('')}</svg>`
}

/**
 * Abre el documento en una ventana lista para imprimir o guardar como PDF
 * (tamaño carta/A4). Imprime cuando el logo y las fuentes ya cargaron.
 */
export function printDocument(doc: PrintableDocument) {
  const currency = doc.moneda ?? 'COP'
  const money = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  const rows = doc.items
    .map(
      (item, i) => `<tr>
        <td class="n">${i + 1}</td>
        <td>${escape(item.producto)}</td>
        <td class="r">${quantity.format(item.cantidad)}</td>
        <td class="r">${money.format(item.precio)}</td>
        <td class="r strong">${money.format(subtotal(item))}</td>
      </tr>`,
    )
    .join('')
  const meta = doc.meta
    .map(([k, v]) => `<div class="row"><span>${escape(k)}</span><strong>${escape(v)}</strong></div>`)
    .join('')
  const place = [doc.cliente.direccion, doc.cliente.municipio].filter(Boolean).join(', ')
  const crop = LOGO_CROP
  const pct = (part: number, whole: number) => `${((part / whole) * 100).toFixed(3)}%`
  const issued = longDate.format(new Date())

  // El mismo documento siempre da el mismo código (no depende de cuándo se imprime).
  const grandTotal = total(doc.items)
  const cude = hexDigest(
    [doc.tipo, doc.numero, doc.fecha.slice(0, 10), grandTotal.toFixed(2), doc.cliente.nit, currency].join('|'),
    96,
  )
  const barcodeText = `${doc.numero.replace(/[^A-Z0-9]/gi, '')}${doc.fecha.slice(0, 10).replaceAll('-', '')}${cude.slice(0, 8).toUpperCase()}`

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${doc.tipo} ${escape(doc.numero)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Manrope:wght@600;700;800&display=swap">
<style>
  @page { size: auto; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  :root { --brand: #145c3f; --brand-dark: #0d4031; --brand-soft: #ecf6f0; --line: #e3e8e5; --muted: #64748b; --ink: #0f172a; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 13px/1.5 'DM Sans', system-ui, sans-serif; color: var(--ink); }
  .page { position: relative; max-width: 780px; margin: 0 auto; padding: 8px 0 0; }
  .bar { height: 6px; border-radius: 3px; background: linear-gradient(90deg, var(--brand-dark), var(--brand) 60%, #6fcf9e); }

  header { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 22px 0 20px; }
  .logo { position: relative; width: 170px; aspect-ratio: ${crop.width} / ${crop.height}; overflow: hidden; }
  .logo img { position: absolute; width: ${pct(crop.imageWidth, crop.width)}; left: -${pct(crop.left, crop.width)}; top: -${pct(crop.top, crop.height)}; }
  .tagline { margin-top: 4px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .doc { text-align: right; }
  .doc .type { font: 700 11px Manrope, sans-serif; letter-spacing: .16em; text-transform: uppercase; color: var(--brand); }
  .doc h1 { margin: 2px 0 4px; font: 800 30px/1.1 Manrope, sans-serif; letter-spacing: -.01em; }
  .doc .date { color: var(--muted); }

  .cards { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin: 4px 0 24px; }
  .card { padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; }
  .card h2 { margin: 0 0 8px; font: 700 10.5px Manrope, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--brand); }
  .client-name { font: 700 15px Manrope, sans-serif; }
  .muted { color: var(--muted); }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; border-bottom: 1px dashed var(--line); }
  .row:last-child { border-bottom: 0; }
  .row span { color: var(--muted); }

  table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  thead th { padding: 10px 12px; font: 700 10.5px Manrope, sans-serif; letter-spacing: .1em; text-transform: uppercase; text-align: left; color: #fff; background: var(--brand); }
  tbody td { padding: 11px 12px; border-top: 1px solid var(--line); font-variant-numeric: tabular-nums; }
  tbody tr:first-child td { border-top: 0; }
  tbody tr:nth-child(even) td { background: #f8faf9; }
  .n { width: 36px; color: var(--muted); }
  .r { text-align: right; white-space: nowrap; }
  .strong { font-weight: 700; }
  .empty { padding: 20px; text-align: center; color: var(--muted); }

  .totals { display: flex; justify-content: flex-end; margin-top: 16px; }
  .totals .box { min-width: 280px; }
  .totals .line { display: flex; justify-content: space-between; padding: 6px 14px; color: var(--muted); }
  .totals .grand { display: flex; justify-content: space-between; align-items: baseline; margin-top: 6px; padding: 12px 14px; border-radius: 10px; color: #fff; background: var(--brand-dark); }
  .totals .grand span { font: 700 12px Manrope, sans-serif; letter-spacing: .12em; text-transform: uppercase; }
  .totals .grand strong { font: 800 22px Manrope, sans-serif; font-variant-numeric: tabular-nums; }

  .closing { display: grid; grid-template-columns: 1fr 220px; gap: 32px; align-items: end; margin-top: 36px; break-inside: avoid; }
  .validation { display: flex; gap: 18px; align-items: flex-start; padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; }
  .barcode { flex-shrink: 0; text-align: center; }
  .barcode svg { display: block; }
  .barcode .code { margin-top: 4px; font: 500 10px/1 ui-monospace, 'Cascadia Mono', Consolas, monospace; letter-spacing: .12em; }
  .cude { min-width: 0; }
  .cude h3 { margin: 0 0 4px; font: 700 10.5px Manrope, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--brand); }
  .cude code { display: block; font: 9.5px/1.45 ui-monospace, 'Cascadia Mono', Consolas, monospace; color: var(--ink); overflow-wrap: anywhere; }
  .cude p { margin: 6px 0 0; font-size: 10px; color: var(--muted); }
  .signature { padding-top: 6px; border-top: 1px solid var(--ink); text-align: center; font-size: 12px; }

  footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 36px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 11px; color: var(--muted); }

  .watermark { position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: -1; }
  .watermark span { transform: rotate(-28deg); font: 800 110px Manrope, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: rgba(20, 92, 63, .07); }
</style></head><body>
${doc.marcaAgua ? `<div class="watermark"><span>${escape(doc.marcaAgua)}</span></div>` : ''}
<div class="page">
  <div class="bar"></div>
  <header>
    <div>
      <div class="logo"><img src="${logoUrl()}" alt="Kestrel"></div>
      <div class="tagline">Gestión comercial</div>
    </div>
    <div class="doc">
      <div class="type">${doc.tipo}</div>
      <h1>${escape(doc.numero)}</h1>
      <div class="date">${longDate.format(new Date(doc.fecha))}</div>
    </div>
  </header>

  <section class="cards">
    <div class="card">
      <h2>Cliente</h2>
      <div class="client-name">${escape(doc.cliente.nombre)}</div>
      <div class="muted">NIT ${escape(doc.cliente.nit)}</div>
      ${place ? `<div>${escape(place)}</div>` : ''}
      ${doc.cliente.contacto ? `<div>Atención: <strong>${escape(doc.cliente.contacto)}</strong></div>` : ''}
    </div>
    <div class="card">
      <h2>Detalles</h2>
      ${meta}
    </div>
  </section>

  <table>
    <thead><tr><th class="n">#</th><th>Producto</th><th class="r">Cantidad</th><th class="r">Precio unitario</th><th class="r">Subtotal</th></tr></thead>
    <tbody>${rows || '<tr><td class="empty" colspan="5">Sin productos.</td></tr>'}</tbody>
  </table>

  <div class="totals">
    <div class="box">
      <div class="line"><span>Productos</span><span>${doc.items.length}</span></div>
      <div class="grand"><span>Total</span><strong>${money.format(grandTotal)}</strong></div>
    </div>
  </div>

  <section class="closing">
    <div class="validation">
      <div class="barcode">${barcodeSvg(cude)}<div class="code">${escape(barcodeText)}</div></div>
      <div class="cude">
        <h3>CUDE</h3>
        <code>${cude}</code>
        <p>Representación gráfica simulada con fines de demostración. Sin validez fiscal ante la DIAN.</p>
      </div>
    </div>
    <div class="signature">Asesor comercial</div>
  </section>

  <footer>
    <span>Documento generado por Kestrel · Gestión comercial</span>
    <span>Valores en ${escape(currency)} · Emitido el ${issued}</span>
  </footer>
</div>
<script>
  // Imprime cuando el logo y las fuentes están listos (si tardan, a los 2,5 s igual).
  const logo = document.querySelector('.logo img');
  const ready = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    logo.complete ? Promise.resolve() : new Promise((r) => { logo.onload = r; logo.onerror = r; }),
  ]);
  Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]).then(() => window.print());
<\/script>
</body></html>`

  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  return true
}
