<script lang="ts">
  import { untrack } from 'svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { FRECUENCIAS_VISITA } from '../../lib/domain/clients'
  import type { CatalogEntry } from '../../lib/services/catalogsApi'
  import { NIT_PATTERN, clientDisplayName, type ApiClient, type ClientPayload } from '../../lib/services/clientsApi'
  import { PHONE_PATTERN, primaryContact, type ContactPayload } from '../../lib/services/contactsApi'
  import { geocode } from '../../lib/services/geocoding'
  import { ApiError } from '../../lib/services/http'
  import { can } from '../../lib/permissions.svelte'
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { clientDirectory, errorText } from '../../lib/stores/clientDirectory.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'

  interface Props {
    open: boolean
    /** Si llega un cliente, el formulario edita; si no, crea. */
    client?: ApiClient | null
    onclose: () => void
    onsaved?: (client: ApiClient) => void
  }

  let { open, client = null, onclose, onsaved }: Props = $props()

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Todo se edita como texto; al guardar, '' se vuelve null y los ids a número.
  interface ClientForm {
    tradeName: string
    businessName: string
    nit: string
    clientTypeId: number | ''
    clientPotentialId: number | ''
    clientStatusId: number | ''
    zoneId: number | ''
    visitFrequencyDays: number | ''
    department: string
    municipality: string
    neighborhood: string
    address: string
    phone: string
    email: string
    latitude: string
    longitude: string
  }

  interface ContactForm {
    name: string
    jobTitle: string
    mobile: string
    phone: string
    email: string
  }

  const emptyContact = (): ContactForm => ({ name: '', jobTitle: '', mobile: '', phone: '', email: '' })

  function toForm(c: ApiClient | null): ClientForm {
    const text = (v: string | null | undefined) => v ?? ''
    const id = (v: number | null | undefined) => v ?? ''
    return {
      tradeName: text(c?.tradeName),
      businessName: text(c?.businessName),
      nit: text(c?.nit),
      clientTypeId: id(c?.clientTypeId),
      clientPotentialId: id(c?.clientPotentialId),
      clientStatusId: id(c?.clientStatusId ?? catalogs.clientStatuses.find((s) => s.name === 'Prospecto')?.id),
      zoneId: id(c?.zoneId),
      visitFrequencyDays: c ? id(c.visitFrequencyDays) : 15,
      department: c ? text(c.department) : 'Atlántico',
      municipality: text(c?.municipality),
      neighborhood: text(c?.neighborhood),
      address: text(c?.address),
      phone: text(c?.phone),
      email: text(c?.email),
      latitude: c?.latitude == null ? '' : String(c.latitude),
      longitude: c?.longitude == null ? '' : String(c.longitude),
    }
  }

  function toPayload(f: ClientForm): ClientPayload {
    const text = (v: string) => v.trim() || null
    const num = (v: number | '') => (v === '' ? null : v)
    const coord = (v: string) => (v.trim() === '' ? null : Number(v))
    return {
      tradeName: text(f.tradeName),
      businessName: f.businessName.trim(),
      nit: f.nit.trim(),
      clientTypeId: num(f.clientTypeId),
      clientPotentialId: num(f.clientPotentialId),
      clientStatusId: num(f.clientStatusId),
      zoneId: num(f.zoneId),
      visitFrequencyDays: num(f.visitFrequencyDays),
      department: text(f.department),
      municipality: text(f.municipality),
      neighborhood: text(f.neighborhood),
      address: text(f.address),
      phone: text(f.phone),
      email: text(f.email),
      latitude: coord(f.latitude),
      longitude: coord(f.longitude),
    }
  }

  let form = $state<ClientForm>(toForm(null))
  let contact = $state<ContactForm>(emptyContact())
  /** Contacto principal que se está editando; null si se va a crear uno nuevo. */
  let contactId = $state<number | null>(null)
  /** Cómo llegó el contacto, para no reenviarlo si no cambió. */
  let contactLoaded = $state('')
  let contactLoading = $state(false)
  let showErrors = $state(false)
  let saving = $state(false)
  let locating = $state(false)
  let serverError = $state('')

  // Cada vez que se abre, carga el cliente a editar o un formulario limpio.
  // untrack: toForm lee los catálogos; sin esto, al terminar de cargarlos se borraría lo escrito.
  $effect(() => {
    if (!open) return
    const editing = client
    untrack(() => {
      showErrors = false
      serverError = ''
      form = toForm(editing)
      contact = emptyContact()
      contactId = null
      contactLoaded = JSON.stringify(contact)
      catalogs.load()
      if (editing && can.manageContacts) loadPrimaryContact(editing.id)
    })
  })

  async function loadPrimaryContact(clientId: number) {
    contactLoading = true
    try {
      await clientDirectory.loadContacts(clientId)
      const current = primaryContact(clientDirectory.contacts[clientId] ?? [])
      if (current && client?.id === clientId) {
        contactId = current.id
        contact = {
          name: current.name,
          jobTitle: current.jobTitle ?? '',
          mobile: current.mobile ?? '',
          phone: current.phone ?? '',
          email: current.email ?? '',
        }
        contactLoaded = JSON.stringify(contact)
      }
    } catch {
      // Sin contactos el formulario permite crear uno nuevo.
    } finally {
      contactLoading = false
    }
  }

  let contactFilled = $derived(Object.values(contact).some((v) => v.trim()))

  let errors = $derived.by(() => {
    const e: Record<string, string> = {}
    if (!form.businessName.trim()) e.businessName = 'Ingresa la razón social.'
    if (!NIT_PATTERN.test(form.nit.trim())) e.nit = 'NIT inválido: 9 dígitos y dígito de verificación. Ej.: 900123456-7'
    if (form.email.trim() && !EMAIL.test(form.email.trim())) e.email = 'Correo inválido.'
    if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) e.phone = 'Teléfono inválido.'
    const lat = form.latitude.trim()
    const lng = form.longitude.trim()
    if (!lat !== !lng) e.coords = 'Ingresa latitud y longitud, o deja ambas vacías.'
    else if (lat && (!Number.isFinite(Number(lat)) || Math.abs(Number(lat)) > 90)) e.coords = 'Latitud inválida (−90 a 90).'
    else if (lng && (!Number.isFinite(Number(lng)) || Math.abs(Number(lng)) > 180)) e.coords = 'Longitud inválida (−180 a 180).'
    if (can.manageContacts && contactFilled) {
      if (!contact.name.trim()) e.contactName = 'Ingresa el nombre del contacto.'
      if (contact.mobile.trim() && !PHONE_PATTERN.test(contact.mobile.trim())) e.contactMobile = 'Celular inválido.'
      if (contact.phone.trim() && !PHONE_PATTERN.test(contact.phone.trim())) e.contactPhone = 'Teléfono inválido.'
      if (contact.email.trim() && !EMAIL.test(contact.email.trim())) e.contactEmail = 'Correo inválido.'
      if (!contact.mobile.trim() && !contact.phone.trim() && !contact.email.trim())
        e.contactMobile = 'Ingresa al menos un celular, teléfono o correo.'
    }
    return e
  })

  let err = $derived(showErrors ? errors : {})

  /** Ubica la dirección con OpenStreetMap y llena las coordenadas. */
  async function locate() {
    if (!form.address.trim() || !form.municipality.trim()) {
      toasts.push({ tone: 'info', icon: 'map-pin', title: 'Falta la dirección', message: 'Ingresa dirección y municipio para ubicar.' })
      return false
    }
    locating = true
    const coords = await geocode(form.address.trim(), form.municipality.trim(), form.department.trim())
    locating = false
    if (!coords) {
      toasts.push({ tone: 'warning', icon: 'map-pin', title: 'No encontramos la dirección', message: 'Ingresa las coordenadas a mano.' })
      return false
    }
    form.latitude = coords[0].toFixed(6)
    form.longitude = coords[1].toFixed(6)
    return true
  }

  /** Solo los campos que cambiaron, para no tocar el resto en el backend. */
  function changedFields(next: ClientPayload, current: ApiClient): Partial<ClientPayload> {
    return Object.fromEntries(
      Object.entries(next).filter(([key, value]) => current[key as keyof ClientPayload] !== value),
    ) as Partial<ClientPayload>
  }

  function contactPayload(): ContactPayload {
    const optional = (v: string) => v.trim() || undefined
    return {
      name: contact.name.trim(),
      jobTitle: optional(contact.jobTitle),
      mobile: optional(contact.mobile),
      phone: optional(contact.phone),
      email: optional(contact.email),
      isPrimary: true,
    }
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    showErrors = true
    serverError = ''
    if (Object.keys(errors).length) {
      document.querySelector<HTMLElement>('#client-form .invalid')?.focus()
      return
    }
    saving = true
    try {
      // Si la dirección cambió y no hay coordenadas a mano, se intenta ubicar sola.
      const moved = !client || client.address !== (form.address.trim() || null) || client.municipality !== (form.municipality.trim() || null)
      if (moved && !form.latitude.trim() && form.address.trim() && form.municipality.trim()) await locate()

      const payload = toPayload(form)
      const withContact = can.manageContacts && contactFilled && JSON.stringify(contact) !== contactLoaded
      let saved: ApiClient
      if (client) {
        const changes = changedFields(payload, client)
        saved = Object.keys(changes).length ? await clientDirectory.update(client.id, changes) : client
        const contactOk = withContact ? await clientDirectory.saveContact(client.id, contactId, contactPayload()) : true
        if (contactOk) toasts.push({ tone: 'success', icon: 'check', title: 'Cambios guardados', message: clientDisplayName(saved) })
      } else {
        saved = await clientDirectory.create(payload, withContact ? contactPayload() : null)
      }
      onsaved?.(saved)
      onclose()
    } catch (error) {
      serverError =
        error instanceof ApiError && error.status === 409
          ? 'Ya existe un cliente con ese NIT.'
          : errorText(error, 'No se pudo guardar. Intenta de nuevo.')
    } finally {
      saving = false
    }
  }
</script>

<!-- Un cliente puede conservar una entrada de catálogo que luego se desactivó. -->
{#snippet options(entries: CatalogEntry[], current: number | '', placeholder: string)}
  <option value="">{placeholder}</option>
  {#if current !== '' && !entries.some((e) => e.id === current)}
    <option value={current}>Valor actual (inactivo)</option>
  {/if}
  {#each entries as entry (entry.id)}<option value={entry.id}>{entry.name}</option>{/each}
{/snippet}

<Modal
  {open}
  {onclose}
  size="lg"
  title={client ? 'Editar cliente' : 'Nuevo cliente'}
  subtitle={client ? clientDisplayName(client) : 'Registra un cliente en la base comercial.'}
>
  <form id="client-form" class="form" onsubmit={submit} novalidate>
    {#if serverError}<p class="server-error" role="alert">{serverError}</p>{/if}

    <fieldset>
      <legend>Datos generales</legend>
      <label class="field span-2">
        <span>Razón social *</span>
        <input class="input" class:invalid={err.businessName} bind:value={form.businessName} placeholder="Grupo Horizonte S.A.S" />
        {#if err.businessName}<small>{err.businessName}</small>{/if}
      </label>
      <label class="field">
        <span>NIT *</span>
        <input class="input" class:invalid={err.nit} bind:value={form.nit} placeholder="900123456-7" />
        {#if err.nit}<small>{err.nit}</small>{/if}
      </label>
      <label class="field span-2">
        <span>Nombre comercial</span>
        <input class="input" bind:value={form.tradeName} placeholder="Grupo Horizonte" />
      </label>
      <label class="field">
        <span>Tipo de cliente</span>
        <select class="select" bind:value={form.clientTypeId}>
          {@render options(catalogs.clientTypes, form.clientTypeId, 'Sin tipo')}
        </select>
      </label>
      <label class="field">
        <span>Potencial</span>
        <select class="select" bind:value={form.clientPotentialId}>
          {@render options(catalogs.potentials, form.clientPotentialId, 'Sin potencial')}
        </select>
      </label>
      <label class="field">
        <span>Estado comercial</span>
        <select class="select" bind:value={form.clientStatusId}>
          {@render options(catalogs.clientStatuses, form.clientStatusId, 'Sin estado')}
        </select>
      </label>
      <label class="field">
        <span>Frecuencia de visita</span>
        <select class="select" bind:value={form.visitFrequencyDays}>
          <option value="">Sin definir</option>
          {#if form.visitFrequencyDays !== '' && !FRECUENCIAS_VISITA.includes(form.visitFrequencyDays)}
            <option value={form.visitFrequencyDays}>Cada {form.visitFrequencyDays} días</option>
          {/if}
          {#each FRECUENCIAS_VISITA as f (f)}<option value={f}>Cada {f} días</option>{/each}
        </select>
      </label>
    </fieldset>

    <fieldset>
      <legend>Ubicación</legend>
      <label class="field">
        <span>Departamento</span>
        <input class="input" bind:value={form.department} placeholder="Atlántico" />
      </label>
      <label class="field">
        <span>Municipio</span>
        <input class="input" bind:value={form.municipality} placeholder="Barranquilla" />
      </label>
      <label class="field">
        <span>Zona</span>
        <select class="select" bind:value={form.zoneId}>
          {@render options(catalogs.zones, form.zoneId, 'Sin zona')}
        </select>
      </label>
      <label class="field span-2">
        <span>Dirección</span>
        <input class="input" bind:value={form.address} placeholder="Cra. 54 #68-196" />
      </label>
      <label class="field">
        <span>Barrio</span>
        <input class="input" bind:value={form.neighborhood} placeholder="El Prado" />
      </label>
      <label class="field">
        <span>Latitud</span>
        <input class="input" class:invalid={err.coords} inputmode="decimal" bind:value={form.latitude} placeholder="10.9878" />
      </label>
      <label class="field">
        <span>Longitud</span>
        <input class="input" class:invalid={err.coords} inputmode="decimal" bind:value={form.longitude} placeholder="-74.7889" />
      </label>
      <div class="field locate">
        <button class="btn btn-outline" type="button" onclick={locate} disabled={locating}>
          {locating ? 'Ubicando…' : 'Ubicar por dirección'}
        </button>
      </div>
      {#if err.coords}<small class="span-3">{err.coords}</small>{/if}
      <label class="field">
        <span>Teléfono empresa</span>
        <input class="input" class:invalid={err.phone} bind:value={form.phone} placeholder="605 3456789" />
        {#if err.phone}<small>{err.phone}</small>{/if}
      </label>
      <label class="field span-2">
        <span>Correo empresa</span>
        <input class="input" class:invalid={err.email} type="email" bind:value={form.email} placeholder="contacto@empresa.com" />
        {#if err.email}<small>{err.email}</small>{/if}
      </label>
    </fieldset>

    {#if can.manageContacts}
      <fieldset disabled={contactLoading}>
        <legend>Contacto principal {contactLoading ? '· cargando…' : ''}</legend>
        <label class="field">
          <span>Nombre</span>
          <input class="input" class:invalid={err.contactName} bind:value={contact.name} />
          {#if err.contactName}<small>{err.contactName}</small>{/if}
        </label>
        <label class="field">
          <span>Cargo</span>
          <input class="input" bind:value={contact.jobTitle} placeholder="Jefe de compras" />
        </label>
        <label class="field">
          <span>Celular</span>
          <input class="input" class:invalid={err.contactMobile} bind:value={contact.mobile} placeholder="300 1234567" />
          {#if err.contactMobile}<small>{err.contactMobile}</small>{/if}
        </label>
        <label class="field">
          <span>Teléfono</span>
          <input class="input" class:invalid={err.contactPhone} bind:value={contact.phone} placeholder="605 3456789" />
          {#if err.contactPhone}<small>{err.contactPhone}</small>{/if}
        </label>
        <label class="field span-2">
          <span>Correo</span>
          <input class="input" class:invalid={err.contactEmail} type="email" bind:value={contact.email} />
          {#if err.contactEmail}<small>{err.contactEmail}</small>{/if}
        </label>
      </fieldset>
    {/if}
  </form>

  {#snippet footer()}
    <button class="btn btn-outline" type="button" onclick={onclose}>Cancelar</button>
    <button class="btn btn-primary" type="submit" form="client-form" disabled={saving || locating}>
      {saving ? 'Guardando…' : client ? 'Guardar cambios' : 'Crear cliente'}
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

  .locate {
    justify-content: flex-end;
  }

  .server-error {
    padding: 10px 14px;
    font-size: 13px;
    color: var(--danger);
    border: 1px solid var(--danger);
    border-radius: var(--radius-sm);
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
