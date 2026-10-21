<script lang="ts">
  import Modal from '../lib/components/Modal.svelte'
  import { dashboard } from '../lib/stores/dashboard.svelte'

  interface Props {
    open: boolean
    /** Cliente preseleccionado (p. ej. al programar desde el detalle de un cliente). */
    presetClientId?: string
    onclose: () => void
  }

  let { open, presetClientId = '', onclose }: Props = $props()

  const today = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }

  let clientId = $state('')
  let fecha = $state(today())
  let hora = $state('09:00')
  let observacion = $state('')
  let saving = $state(false)
  let error = $state('')

  // Reinicia el formulario cada vez que se abre.
  $effect(() => {
    if (open) {
      clientId = presetClientId
      fecha = today()
      hora = '09:00'
      observacion = ''
      error = ''
    }
  })

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!clientId) {
      error = 'Selecciona un cliente.'
      return
    }
    saving = true
    try {
      await dashboard.scheduleVisit({
        clientId,
        fecha: new Date(`${fecha}T${hora}`).toISOString(),
        observacion: observacion.trim() || undefined,
      })
      onclose()
    } catch {
      error = 'No se pudo registrar la visita. Intenta de nuevo.'
    } finally {
      saving = false
    }
  }
</script>

<Modal {open} {onclose} title="Programar visita" subtitle="Agenda una visita comercial a un cliente.">
  <form id="register-visit" class="form" onsubmit={submit} novalidate>
    <label class="field full">
      <span>Cliente</span>
      <select class="select" bind:value={clientId} class:invalid={error && !clientId}>
        <option value="" disabled>Selecciona un cliente</option>
        {#each dashboard.clients as client (client.id)}
          <option value={client.id}>{client.nombre} · {client.municipio}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Fecha</span>
      <input class="input" type="date" bind:value={fecha} min={today()} required />
    </label>

    <label class="field">
      <span>Hora</span>
      <input class="input" type="time" bind:value={hora} required />
    </label>

    <label class="field full">
      <span>Observación <em>(opcional)</em></span>
      <textarea class="input" rows="3" bind:value={observacion} placeholder="Objetivo de la visita, contacto, etc."
      ></textarea>
    </label>

    {#if error}<p class="error full" role="alert">{error}</p>{/if}
  </form>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="register-visit" disabled={saving}>
      {saving ? 'Guardando…' : 'Programar visita'}
    </button>
  {/snippet}
</Modal>

<style>
  .form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .field em {
    font-style: normal;
    font-weight: 400;
    color: var(--text-muted);
  }

  .full {
    grid-column: 1 / -1;
  }

  textarea.input {
    height: auto;
    padding: 10px 12px;
    font-weight: 400;
    resize: vertical;
  }

  .field :global(.select),
  .field :global(.input) {
    width: 100%;
    font-weight: 400;
  }

  .invalid {
    border-color: var(--danger);
  }

  .error {
    font-size: 0.85rem;
    color: var(--danger);
  }
</style>
