<script lang="ts">
  import { untrack } from 'svelte'
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { can } from '../../lib/permissions.svelte'
  import { clientStatusTone } from '../../lib/domain/clients'
  import { ACTIVITY_LABELS } from '../../lib/services/activityApi'
  import { clientDisplayName, type ApiClient } from '../../lib/services/clientsApi'
  import { catalogs } from '../../lib/stores/catalogs.svelte'
  import { clientDirectory, errorText } from '../../lib/stores/clientDirectory.svelte'
  import { clientPortfolios } from '../../lib/stores/clientPortfolios.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import { formatDate, formatTime } from '../../lib/utils/format'

  interface Props {
    client: ApiClient | null
    onclose: () => void
    onedit: (client: ApiClient) => void
  }

  let { client, onclose, onedit }: Props = $props()

  let contactsError = $state(false)
  let activityError = $state(false)
  let toggling = $state(false)
  let togglingContact = $state<number | null>(null)
  let portfolioBusy = $state(false)
  let portfolioToAdd = $state<number | ''>('')

  // Por id: el objeto del cliente se reemplaza en cada consulta periódica.
  let clientId = $derived(client?.id ?? null)

  $effect(() => {
    if (clientId === null) return
    const id = clientId
    contactsError = false
    portfolioToAdd = ''
    // untrack: solo debe repetirse al cambiar de cliente, no cuando terminan de cargar.
    untrack(() => {
      clientDirectory.loadContacts(id).catch(() => (contactsError = true))
      clientPortfolios.load()
    })
  })

  // Se vuelve a pedir cuando un cambio invalida el historial cacheado (ver `invalidateActivity`).
  $effect(() => {
    if (clientId === null || clientDirectory.activity[clientId]) return
    activityError = false
    clientDirectory.loadActivity(clientId).catch(() => (activityError = true))
  })

  let activity = $derived(clientId !== null ? (clientDirectory.activity[clientId] ?? null) : null)
  let memberOf = $derived(clientId !== null ? clientPortfolios.of(clientId) : [])
  let addable = $derived(clientPortfolios.portfolios.filter((p) => p.active && !memberOf.some((m) => m.id === p.id)))

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

  async function toggleContact(contactId: number, active: boolean) {
    if (clientId === null) return
    const contact = contacts?.find((c) => c.id === contactId)
    if (!active && contact && !confirm(`¿Desactivar el contacto ${contact.name}? Su historial se conserva.`)) return
    togglingContact = contactId
    await clientDirectory.setContactActive(clientId, contactId, active)
    togglingContact = null
  }

  async function changePortfolio(portfolioId: number, add: boolean) {
    if (clientId === null) return
    portfolioBusy = true
    try {
      if (add) await clientPortfolios.add(portfolioId, clientId)
      else await clientPortfolios.remove(portfolioId, clientId)
      portfolioToAdd = ''
    } catch (error) {
      toasts.push({
        tone: 'warning',
        icon: 'alert-circle',
        title: add ? 'No se pudo agregar al portafolio' : 'No se pudo retirar del portafolio',
        message: errorText(error, 'Intenta de nuevo.'),
      })
    } finally {
      portfolioBusy = false
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
              {#if can.manageContacts}
                <button
                  class="contact-toggle"
                  disabled={togglingContact === contact.id}
                  onclick={() => toggleContact(contact.id, !contact.active)}
                >
                  {contact.active ? 'Desactivar' : 'Reactivar'}
                </button>
              {/if}
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
      <h3>Portafolios</h3>
      {#if clientPortfolios.status === 'error'}
        <p class="muted">No pudimos cargar los portafolios.</p>
      {:else if clientPortfolios.status !== 'ready'}
        <p class="muted">Cargando portafolios…</p>
      {:else}
        {#if memberOf.length}
          <ul class="chips">
            {#each memberOf as portfolio (portfolio.id)}
              <li class="chip" class:off={!portfolio.active} title={portfolio.description ?? undefined}>
                {portfolio.name}
                {#if can.managePortfolios}
                  <button
                    onclick={() => changePortfolio(portfolio.id, false)}
                    disabled={portfolioBusy}
                    aria-label="Retirar de {portfolio.name}"
                  >
                    <Icon name="x" size={12} />
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="muted">No pertenece a ningún portafolio.</p>
        {/if}
        {#if can.managePortfolios && addable.length}
          <div class="add-portfolio">
            <select class="select" bind:value={portfolioToAdd} aria-label="Portafolio a agregar">
              <option value="">Agregar a portafolio…</option>
              {#each addable as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
            </select>
            <button
              class="btn btn-outline"
              disabled={portfolioToAdd === '' || portfolioBusy}
              onclick={() => portfolioToAdd !== '' && changePortfolio(portfolioToAdd, true)}
            >
              <Icon name="plus" size={16} /> Agregar
            </button>
          </div>
        {/if}
      {/if}
    </section>

    <section>
      <h3>Historial</h3>
      {#if activityError}
        <p class="muted">No pudimos cargar el historial.</p>
      {:else if !activity}
        <p class="muted">Cargando historial…</p>
      {:else if activity.entries.length === 0}
        <p class="muted">Sin actividad registrada.</p>
      {:else}
        <ol class="timeline">
          {#each activity.entries as entry (entry.id)}
            <li>
              <p class="strong">{ACTIVITY_LABELS[entry.action] ?? entry.action}</p>
              <p class="muted">
                {formatDate(entry.createdAt)} · {formatTime(entry.createdAt)} · {entry.user.name ?? 'Usuario'}
              </p>
            </li>
          {/each}
        </ol>
        {#if activity.total > activity.entries.length}
          <p class="muted more">Mostrando las {activity.entries.length} más recientes de {activity.total}.</p>
        {/if}
      {/if}
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

  .contact-toggle {
    margin-top: 6px;
    padding: 0;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--brand-600);
    background: none;
    border: 0;
    cursor: pointer;
  }

  .contact-toggle:disabled {
    opacity: 0.6;
    cursor: default;
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

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    font: 600 12px/16px var(--font-heading);
    color: var(--brand-700);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .chip.off {
    color: var(--text-muted);
    background: var(--neutral-100);
  }

  .chip button {
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    margin-right: -4px;
    padding: 0;
    color: inherit;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }

  .chip button:hover:not(:disabled) {
    background: var(--brand-100);
  }

  .add-portfolio {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    margin-top: 12px;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 0 0 0 16px;
    list-style: none;
    border-left: 2px solid var(--border-default);
  }

  .timeline li {
    position: relative;
  }

  .timeline li::before {
    content: '';
    position: absolute;
    top: 6px;
    left: -21px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--brand-500);
  }

  .more {
    margin-top: 10px;
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
