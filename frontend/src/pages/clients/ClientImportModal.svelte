<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import {
    IMPORT_MAX_BYTES,
    downloadImportTemplate,
    importClients,
    type ClientImportReport,
  } from '../../lib/services/clientsApi'
  import { ApiError } from '../../lib/services/http'
  import { clientDirectory, errorText } from '../../lib/stores/clientDirectory.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'

  // Importación masiva de clientes desde CSV (HU-22): primero se valida el archivo
  // sin guardar nada (dryRun) y, si no tiene errores, se importa todo o nada.

  interface Props {
    open: boolean
    onclose: () => void
  }

  let { open, onclose }: Props = $props()

  /** 404: el backend desplegado todavía no incluye la importación. */
  const failure = (e: unknown, fallback: string) =>
    e instanceof ApiError && e.status === 404
      ? 'La importación de clientes aún no está disponible en el servidor.'
      : errorText(e, fallback)

  let file = $state<File | null>(null)
  let report = $state<ClientImportReport | null>(null)
  let busy = $state<'template' | 'validate' | 'import' | null>(null)
  let error = $state('')
  let input = $state<HTMLInputElement>()

  // Cada apertura empieza de cero.
  $effect(() => {
    if (open) reset()
  })

  function reset() {
    file = null
    report = null
    error = ''
    if (input) input.value = ''
  }

  function pick(event: Event) {
    const chosen = (event.currentTarget as HTMLInputElement).files?.[0] ?? null
    report = null
    error = ''
    if (chosen && !/\.csv$/i.test(chosen.name)) {
      error = 'El archivo debe ser un CSV.'
      file = null
      return
    }
    if (chosen && chosen.size > IMPORT_MAX_BYTES) {
      error = 'El archivo supera el máximo de 2 MB.'
      file = null
      return
    }
    file = chosen
  }

  async function template() {
    busy = 'template'
    try {
      const blob = await downloadImportTemplate()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'plantilla-clientes.csv'
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      error = failure(e, 'No pudimos descargar la plantilla.')
    } finally {
      busy = null
    }
  }

  async function run(dryRun: boolean) {
    if (!file) return
    busy = dryRun ? 'validate' : 'import'
    error = ''
    try {
      report = await importClients(file, dryRun)
      if (report.status === 'imported') {
        toasts.push({
          tone: 'success',
          icon: 'check',
          title: 'Clientes importados',
          message: `${report.importedRows} ${report.importedRows === 1 ? 'cliente nuevo' : 'clientes nuevos'} en la cartera.`,
        })
        clientDirectory.refresh()
      }
    } catch (e) {
      error = failure(e, 'No pudimos procesar el archivo. Intenta de nuevo.')
    } finally {
      busy = null
    }
  }

  let canImport = $derived(report?.status === 'validated' && report.totalRows > 0)
</script>

<Modal {open} {onclose} title="Importar clientes" subtitle="Carga tu cartera desde un archivo CSV (máximo 2 MB y 5.000 filas).">
  <div class="steps">
    <section class="step">
      <span class="n">1</span>
      <div>
        <h3>Descarga la plantilla</h3>
        <p>
          Zona, tipo de cliente, potencial y estado se escriben con el nombre exacto del catálogo. Se aceptan
          separadores coma o punto y coma.
        </p>
        <button class="btn btn-outline" type="button" onclick={template} disabled={busy !== null}>
          <Icon name="download" size={16} />
          {busy === 'template' ? 'Descargando…' : 'Plantilla CSV'}
        </button>
      </div>
    </section>

    <section class="step">
      <span class="n">2</span>
      <div>
        <h3>Elige el archivo y valídalo</h3>
        <p>La validación revisa cada fila sin guardar nada.</p>
        <label class="file" class:chosen={file}>
          <Icon name={file ? 'file-text' : 'plus'} size={18} />
          <span>{file ? file.name : 'Seleccionar archivo .csv'}</span>
          <input bind:this={input} type="file" accept=".csv,text/csv" onchange={pick} disabled={busy !== null} />
        </label>
      </div>
    </section>

    {#if error}
      <p class="server-error" role="alert"><Icon name="alert-circle" size={16} /> {error}</p>
    {/if}

    {#if report}
      <section class="report {report.status}" aria-live="polite">
        <div class="totals">
          <div><strong>{report.totalRows}</strong><span>filas</span></div>
          <div><strong>{report.status === 'imported' ? report.importedRows : report.totalRows - report.errorRows}</strong><span>{report.status === 'imported' ? 'importadas' : 'válidas'}</span></div>
          <div class="bad"><strong>{report.errorRows}</strong><span>con error</span></div>
        </div>

        {#if report.status === 'imported'}
          <p class="verdict"><Icon name="check" size={16} /> Importación completa.</p>
        {:else if report.status === 'validated'}
          <p class="verdict">
            <Icon name="check" size={16} />
            {report.totalRows ? 'Archivo válido: puedes importarlo.' : 'El archivo no tiene filas para importar.'}
          </p>
        {:else}
          <p class="verdict">
            <Icon name="alert-circle" size={16} /> No se importó ninguna fila. Corrige los errores y vuelve a validar.
          </p>
          <div class="errors">
            <table>
              <thead>
                <tr><th>Fila</th><th>Columna</th><th>Motivo</th></tr>
              </thead>
              <tbody>
                {#each report.errors as e, i (i)}
                  <tr><td class="num">{e.rowNumber}</td><td><code>{e.column}</code></td><td>{e.reason}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {/if}
  </div>

  {#snippet footer()}
    {#if report?.status === 'imported'}
      <button class="btn btn-outline" type="button" onclick={reset}>Importar otro archivo</button>
      <button class="btn btn-primary" type="button" onclick={onclose}>Listo</button>
    {:else}
      <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
      {#if canImport}
        <button class="btn btn-primary" type="button" onclick={() => run(false)} disabled={busy !== null}>
          {busy === 'import' ? 'Importando…' : `Importar ${report!.totalRows} clientes`}
        </button>
      {:else}
        <button class="btn btn-primary" type="button" onclick={() => run(true)} disabled={!file || busy !== null}>
          {busy === 'validate' ? 'Validando…' : 'Validar archivo'}
        </button>
      {/if}
    {/if}
  {/snippet}
</Modal>

<style>
  .steps {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .step {
    display: flex;
    gap: 14px;
  }

  .n {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    font: 700 13px var(--font-heading);
    color: var(--brand-700);
    background: var(--brand-50);
    border-radius: 50%;
  }

  h3 {
    font-size: 0.95rem;
    font-weight: 600;
  }

  .step p {
    margin: 2px 0 10px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .file {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  .file:hover,
  .file:focus-within {
    border-color: var(--brand-500);
  }

  .file.chosen {
    color: var(--text-primary);
    border-style: solid;
    border-color: var(--border-brand);
    background: var(--brand-50);
  }

  .file span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .server-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    font-size: 0.85rem;
    color: var(--danger);
    border: 1px solid var(--danger);
    border-radius: var(--radius-sm);
  }

  .report {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
    border-radius: var(--radius-md);
    background: var(--bg-page);
  }

  .totals {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .totals div {
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
  }

  .totals strong {
    font: 700 1.3rem var(--font-heading);
    font-variant-numeric: tabular-nums;
  }

  .totals span {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .failed .totals .bad strong {
    color: var(--danger);
  }

  .verdict {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--brand-700);
  }

  .failed .verdict {
    color: var(--danger);
  }

  .errors {
    max-height: 240px;
    overflow: auto;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  th {
    position: sticky;
    top: 0;
    padding: 8px 10px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-align: left;
    text-transform: uppercase;
    color: var(--text-muted);
    background: #f8fafc;
  }

  td {
    padding: 8px 10px;
    border-top: 1px solid var(--border-default);
  }

  .num {
    font-variant-numeric: tabular-nums;
  }

  code {
    font-size: 0.78rem;
  }
</style>
