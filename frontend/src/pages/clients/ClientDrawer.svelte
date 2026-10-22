<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { can } from '../../lib/permissions.svelte'
  import { clientStatusTone } from '../../lib/domain/clients'
  import { clientDisplayName, type ApiClient } from '../../lib/services/clientsApi'
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { clientDirectory, errorText } from '../../lib/stores/clientDirectory.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatDate } from '../../lib/utils/format'

  interface Props {
    client: ApiClient | null
    onclose: () => void
    onedit: (client: ApiClient) => void
  }

  let { client, onclose, onedit }: Props = $props()

  let contactsError = $state(false)
  let toggling = $state(false)

  $effect(() => {
    if (!client) return
    contactsError = false
    clientDirectory.loadContacts(client.id).catch(() => (contactsError = true))
  })

  let contacts = $derived(
    client ? (clientDirectory.contacts[client.id] ?? null)?.toSorted((a, b) => Number(b.isPrimary) - Number(a.isPrimary)) : null,
  )
  let status = $derived(client ? catalogs.name('clientStatuses', client.clientStatusId) : '')
  let located = $derived(!!client && client.latitude !== null && client.longitude !== null)
  let osmUrl = $derived(
    client && located
      ? `https://www.openstreetmap.org/?mlat=${client.latitude}&mlon=${client.longitude}#map=17/${client.latitude}/${client.longitude}`
      : '',
  )
  let place = $derived(
    client ? [client.neighborhood, client.municipality, client.department].filter(Boolean).join(', ') : '',
  )

  async function toggleActive() {
    if (!client) return
    if (client.active && !confirm(`¿Desactivar a ${clientDisplayName(client)}? Su información e historial se conservan.`)) return
    toggling = true
    try {
      await clientDirectory.setActive(client.id, !client.active)
    } catch (error) {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo cambiar el estado', message: errorText(error, 'Intenta de nuevo.') })
    } finally {
      toggling = false
    }
  }

  const dash = (value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? '—' : value)
</script>

<Modal
  open={!!client}
  {onclose}
  variant="drawer"
  title={client ? clientDisplayName(client) : ''}
  subtitle={client ? `${client.businessName} · NIT ${client.nit}` : ''}
>
  {#snippet badge()}
    {#if client}
      {#if !client.active}
        <span class="status inactivo">Desactivado</span>
      {:else if status}
        <span class="status {clientStatusTone(status)}">{status}</span>
      {/if}
    {/if}
  {/snippet}

  {#if client}
    <div class="actions" class:single={!can.toggleClient}>
      <button class="btn btn-primary" onclick={() => onedit(client)}>
        <Icon name="pencil" size={16} /> Editar
      </button>
      {#if can.toggleClient}
        <button class="btn btn-outline" onclick={toggleActive} disabled={toggling}>
          <Icon name={client.active ? 'pause' : 'play'} size={16} />
          {client.active ? 'Desactivar' : 'Reactivar'}
        </button>
      {/if}
    </div>

    <section>
      <h3>Contactos</h3>
      {#if contactsError}
        <p class="muted">No pudimos cargar los contactos.</p>
      {:else if !contacts}
        <p class="muted">Cargando contactos…</p>
      {:else if contacts.length === 0}
        <p class="muted">Sin contactos registrados.</p>
      {:else}
        <ul class="contacts">
          {#each contacts as contact (contact.id)}
            <li class:off={!contact.active}>
              <p class="strong">
                {contact.name}
                {#if contact.isPrimary}<span class="tag">Principal</span>{/if}
                {#if !contact.active}<span class="tag muted-tag">Inactivo</span>{/if}
              </p>
              {#if contact.jobTitle}<p class="muted">{contact.jobTitle}</p>{/if}
              <div class="links">
                {#if contact.mobile}<a href="tel:{contact.mobile.replace(/\s/g, '')}">{contact.mobile}</a>{/if}
                {#if contact.phone}<a href="tel:{contact.phone.replace(/\s/g, '')}">{contact.phone}</a>{/if}
                {#if contact.email}<a href="mailto:{contact.email}">{contact.email}</a>{/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section>
      <h3>Información comercial</h3>
      <dl>
        <div><dt>Tipo</dt><dd>{dash(catalogs.name('clientTypes', client.clientTypeId))}</dd></div>
        <div><dt>Potencial</dt><dd>{dash(catalogs.name('potentials', client.clientPotentialId))}</dd></div>
        <div><dt>Zona</dt><dd>{dash(catalogs.name('zones', client.zoneId))}</dd></div>
        <div>
          <dt>Frecuencia</dt>
          <dd>{client.visitFrequencyDays ? `Cada ${client.visitFrequencyDays} días` : '—'}</dd>
        </div>
        <div><dt>Teléfono</dt><dd>{dash(client.phone)}</dd></div>
        <div><dt>Correo</dt><dd class="wrap">{dash(client.email)}</dd></div>
        <div><dt>Creado</dt><dd>{formatDate(client.createdAt)}</dd></div>
        <div><dt>Actualizado</dt><dd>{formatDate(client.updatedAt)}</dd></div>
      </dl>
    </section>

    <section>
      <h3>Ubicación</h3>
      <p>{client.address ?? 'Sin dirección'}</p>
      {#if place}<p class="muted">{place}</p>{/if}
      {#if located}
        <a class="map-link" href={osmUrl} target="_blank" rel="noreferrer">
          <Icon name="map-pin" size={14} /> Ver en OpenStreetMap
        </a>
      {:else}
        <p class="muted">Sin coordenadas: no aparece en el mapa.</p>
      {/if}
    </section>

    <section>
      <h3>Historial</h3>
      <!-- Pendiente de HU-16 (activity log): el backend aún no expone el historial. -->
      <p class="muted">El historial de actividad estará disponible cuando el backend lo exponga.</p>
    </section>
  {/if}
</Modal>

<style>
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .actions.single {
    grid-template-columns: 1fr;
  }

  section {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid var(--border-default);
  }

  h3 {
    margin-bottom: 10px;
    font: 700 12px/18px var(--font-heading);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .strong {
    font: 700 14px/20px var(--font-heading);
  }

  .muted {
    font-size: 12px;
    color: var(--text-muted);
  }

  .links {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 8px;
  }

  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 16px;
    margin: 0;
  }

  dt {
    font-size: 11px;
    color: var(--text-muted);
  }

  dd {
    margin: 2px 0 0;
    font-weight: 500;
  }

  dd.wrap {
    overflow-wrap: anywhere;
  }

  .contacts {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .contacts li.off {
    opacity: 0.6;
  }

  .tag {
    margin-left: 6px;
    padding: 1px 8px;
    font: 700 10px/14px var(--font-heading);
    vertical-align: middle;
    color: var(--brand-700);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .tag.muted-tag {
    color: var(--text-muted);
    background: var(--neutral-100);
  }

  .map-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 13px;
  }

  .status {
    padding: 2px 10px;
    font: 700 11px/16px var(--font-heading);
    border-radius: 999px;
    color: var(--neutral-700);
    background: var(--neutral-100);
  }

  .status.activo {
    color: var(--brand-700);
    background: var(--brand-50);
  }

  .status.inactivo {
    color: var(--text-muted);
  }
</style>
