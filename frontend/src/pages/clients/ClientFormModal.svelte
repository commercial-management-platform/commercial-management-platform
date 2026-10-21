<script lang="ts">
  import Modal from '../../lib/components/Modal.svelte'
  import {
    FRECUENCIAS_VISITA,
    MUNICIPIOS,
    POTENCIALES,
    SEGMENTOS,
    clientStatusLabel,
  } from '../../lib/domain/clients'
  import { clientsStore } from '../../lib/stores/clients.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { Client, ClientInput, ClientStatus } from '../../lib/types'

  interface Props {
    open: boolean
    /** Si llega un cliente, el formulario edita; si no, crea. */
    client?: Client | null
    onclose: () => void
    onsaved?: (client: Client) => void
  }

  let { open, client = null, onclose, onsaved }: Props = $props()

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const NIT = /^\d{6,10}(-\d)?$/
  const PHONE = /^[\d\s+()-]{7,15}$/

  const empty = (): ClientInput => ({
    nombre: '',
    razonSocial: '',
    nit: '',
    tipo: '',
    potencial: 'Medio',
    estado: 'prospecto',
    municipio: 'Barranquilla',
    barrio: '',
    direccion: '',
    telefono: '',
    email: '',
    frecuenciaVisita: 15,
    contacto: { nombre: '', cargo: '', telefono: '', email: '' },
  })

  let form = $state<ClientInput>(empty())
  let showErrors = $state(false)
  let saving = $state(false)

  // Cada vez que se abre, carga el cliente a editar o un formulario limpio.
  $effect(() => {
    if (!open) return
    showErrors = false
    if (client) {
      const { id, coords, zona, departamento, creadoEn, ultimaVisita, ...input } = $state.snapshot(client)
      form = input
    } else {
      form = empty()
    }
  })

  let errors = $derived.by(() => {
    const e: Record<string, string> = {}
    if (!form.nombre.trim()) e.nombre = 'Ingresa el nombre comercial.'
    if (!NIT.test(form.nit.trim())) e.nit = 'NIT inválido. Ej.: 900123456-7'
    if (!form.tipo) e.tipo = 'Selecciona un segmento.'
    if (!form.direccion.trim()) e.direccion = 'Ingresa la dirección.'
    if (form.email && !EMAIL.test(form.email)) e.email = 'Correo inválido.'
    if (form.telefono && !PHONE.test(form.telefono)) e.telefono = 'Teléfono inválido.'
    if (!form.contacto.nombre.trim()) e.contactoNombre = 'Ingresa el nombre del contacto.'
    if (!PHONE.test(form.contacto.telefono)) e.contactoTelefono = 'Ingresa un celular válido.'
    if (form.contacto.email && !EMAIL.test(form.contacto.email)) e.contactoEmail = 'Correo inválido.'
    return e
  })

  let err = $derived(showErrors ? errors : {})

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    showErrors = true
    if (Object.keys(errors).length) {
      document.querySelector<HTMLElement>('#client-form .invalid')?.focus()
      return
    }
    saving = true
    try {
      const saved = client ? await clientsStore.update(client.id, form) : await clientsStore.create(form)
      if (client) toasts.push({ tone: 'success', icon: 'check', title: 'Cambios guardados', message: saved.nombre })
      onsaved?.(saved)
      onclose()
    } catch {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo guardar', message: 'Intenta de nuevo.' })
    } finally {
      saving = false
    }
  }
</script>

<Modal
  {open}
  {onclose}
  size="lg"
  title={client ? 'Editar cliente' : 'Nuevo cliente'}
  subtitle={client ? client.nombre : 'Registra un cliente en la base comercial.'}
>
  <form id="client-form" class="form" onsubmit={submit} novalidate>
    <fieldset>
      <legend>Datos generales</legend>
      <label class="field span-2">
        <span>Nombre comercial *</span>
        <input class="input" class:invalid={err.nombre} bind:value={form.nombre} placeholder="Grupo Horizonte" />
        {#if err.nombre}<small>{err.nombre}</small>{/if}
      </label>
      <label class="field">
        <span>NIT *</span>
        <input class="input" class:invalid={err.nit} bind:value={form.nit} placeholder="900123456-7" />
        {#if err.nit}<small>{err.nit}</small>{/if}
      </label>
      <label class="field span-2">
        <span>Razón social</span>
        <input class="input" bind:value={form.razonSocial} placeholder="Grupo Horizonte S.A.S" />
      </label>
      <label class="field">
        <span>Segmento *</span>
        <select class="select" class:invalid={err.tipo} bind:value={form.tipo}>
          <option value="" disabled>Selecciona</option>
          {#each SEGMENTOS as s (s)}<option>{s}</option>{/each}
        </select>
        {#if err.tipo}<small>{err.tipo}</small>{/if}
      </label>
      <label class="field">
        <span>Potencial</span>
        <select class="select" bind:value={form.potencial}>
          {#each POTENCIALES as p (p)}<option>{p}</option>{/each}
        </select>
      </label>
      <label class="field">
        <span>Estado</span>
        <select class="select" bind:value={form.estado}>
          {#each Object.entries(clientStatusLabel) as [value, label] (value)}
            <option value={value as ClientStatus}>{label}</option>
          {/each}
        </select>
      </label>
      <label class="field">
        <span>Frecuencia de visita</span>
        <select class="select" bind:value={form.frecuenciaVisita}>
          {#each FRECUENCIAS_VISITA as f (f)}<option value={f}>Cada {f} días</option>{/each}
        </select>
      </label>
    </fieldset>

    <fieldset>
      <legend>Ubicación</legend>
      <label class="field">
        <span>Municipio *</span>
        <select class="select" bind:value={form.municipio}>
          {#each MUNICIPIOS as m (m)}<option>{m}</option>{/each}
        </select>
      </label>
      <label class="field">
        <span>Barrio</span>
        <input class="input" bind:value={form.barrio} placeholder="El Prado" />
      </label>
      <label class="field">
        <span>Dirección *</span>
        <input class="input" class:invalid={err.direccion} bind:value={form.direccion} placeholder="Cra. 54 #68-196" />
        {#if err.direccion}<small>{err.direccion}</small>{/if}
      </label>
      <label class="field">
        <span>Teléfono empresa</span>
        <input class="input" class:invalid={err.telefono} bind:value={form.telefono} placeholder="605 3456789" />
        {#if err.telefono}<small>{err.telefono}</small>{/if}
      </label>
      <label class="field span-2">
        <span>Correo empresa</span>
        <input class="input" class:invalid={err.email} type="email" bind:value={form.email} placeholder="contacto@empresa.com" />
        {#if err.email}<small>{err.email}</small>{/if}
      </label>
    </fieldset>

    <fieldset>
      <legend>Contacto principal</legend>
      <label class="field">
        <span>Nombre *</span>
        <input class="input" class:invalid={err.contactoNombre} bind:value={form.contacto.nombre} />
        {#if err.contactoNombre}<small>{err.contactoNombre}</small>{/if}
      </label>
      <label class="field">
        <span>Cargo</span>
        <input class="input" bind:value={form.contacto.cargo} placeholder="Jefe de compras" />
      </label>
      <label class="field">
        <span>Celular *</span>
        <input class="input" class:invalid={err.contactoTelefono} bind:value={form.contacto.telefono} placeholder="300 1234567" />
        {#if err.contactoTelefono}<small>{err.contactoTelefono}</small>{/if}
      </label>
      <label class="field span-3">
        <span>Correo</span>
        <input class="input" class:invalid={err.contactoEmail} type="email" bind:value={form.contacto.email} />
        {#if err.contactoEmail}<small>{err.contactoEmail}</small>{/if}
      </label>
    </fieldset>
  </form>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="client-form" disabled={saving}>
      {saving ? 'Ubicando y guardando…' : client ? 'Guardar cambios' : 'Crear cliente'}
    </button>
  {/snippet}
</Modal>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  fieldset {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    grid-column: 1 / -1;
    margin-bottom: 12px;
    font: 700 12px/18px var(--font-heading);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-brand);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .span-2 {
    grid-column: span 2;
  }

  .span-3 {
    grid-column: 1 / -1;
  }

  .field span {
    font: 600 12px/18px var(--font-heading);
  }

  .field :global(.input),
  .field :global(.select) {
    width: 100%;
  }

  .invalid {
    border-color: var(--danger);
  }

  small {
    font-size: 12px;
    color: var(--danger);
  }

  @media (max-width: 600px) {
    fieldset {
      grid-template-columns: 1fr;
    }

    .span-2 {
      grid-column: auto;
    }
  }
</style>
