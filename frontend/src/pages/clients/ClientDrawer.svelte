<script lang="ts">
  import Icon from '../../lib/components/Icon.svelte'
  import Modal from '../../lib/components/Modal.svelte'
  import { clientStatusLabel, isOverdue, nextVisit } from '../../lib/domain/clients'
  import { zonaLabel } from '../../lib/domain/routes'
  import { clientsStore } from '../../lib/stores/clients.svelte'
  import { ui } from '../../lib/stores/ui.svelte'
  import type { Client } from '../../lib/types'
  import { formatDate } from '../../lib/utils/format'

  interface Props {
    client: Client | null
    onclose: () => void
    onedit: (client: Client) => void
  }

  let { client, onclose, onedit }: Props = $props()

  $effect(() => {
    if (client) clientsStore.loadHistory(client.id)
  })

  let history = $derived(client ? clientsStore.histories[client.id] : undefined)
  let next = $derived(client ? nextVisit(client.ultimaVisita, client.frecuenciaVisita) : null)
  let overdue = $derived(client ? isOverdue(client.ultimaVisita, client.frecuenciaVisita) : false)
  let osmUrl = $derived(
    client
      ? `https://www.openstreetmap.org/?mlat=${client.coords[0]}&mlon=${client.coords[1]}#map=17/${client.coords[0]}/${client.coords[1]}`
      : '',
  )

  const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
</script>

<Modal
  open={!!client}
  {onclose}
  variant="drawer"
  title={client?.nombre ?? ''}
  subtitle={client ? `${client.razonSocial || client.nombre} · NIT ${client.nit}` : ''}
>
  {#snippet badge()}
    {#if client}<span class="status {client.estado}">{clientStatusLabel[client.estado]}</span>{/if}
  {/snippet}

  {#if client}
    <div class="actions">
      <button class="btn btn-primary" onclick={() => ui.openRegisterVisit(client.id)}>
        <Icon name="calendar" size={16} /> Programar visita
      </button>
      <button class="btn btn-outline" onclick={() => onedit(client)}>
        <Icon name="pencil" size={16} /> Editar
      </button>
    </div>

    <section>
      <h3>Contacto principal</h3>
      <p class="strong">{client.contacto.nombre}</p>
      {#if client.contacto.cargo}<p class="muted">{client.contacto.cargo}</p>{/if}
      <div class="links">
        {#if client.contacto.telefono}
          <a href="tel:{client.contacto.telefono.replace(/\s/g, '')}">{client.contacto.telefono}</a>
        {/if}
        {#if client.contacto.email}<a href="mailto:{client.contacto.email}">{client.contacto.email}</a>{/if}
      </div>
    </section>

    <section>
      <h3>Información comercial</h3>
      <dl>
        <div><dt>Segmento</dt><dd>{client.tipo}</dd></div>
        <div><dt>Potencial</dt><dd>{client.potencial}</dd></div>
        <div><dt>Frecuencia</dt><dd>Cada {client.frecuenciaVisita} días</dd></div>
        <div><dt>Zona</dt><dd>{zonaLabel(client.zona)}</dd></div>
        <div><dt>Última visita</dt><dd>{client.ultimaVisita ? formatDate(client.ultimaVisita) : 'Sin visitas'}</dd></div>
        <div>
          <dt>Próxima visita</dt>
          <dd class:overdue>{next ? `${fecha.format(next)}${overdue ? ' · vencida' : ''}` : 'Por programar'}</dd>
        </div>
      </dl>
    </section>

    <section>
      <h3>Ubicación</h3>
      <p>{client.direccion}</p>
      <p class="muted">{client.barrio ? `${client.barrio}, ` : ''}{client.municipio}, {client.departamento}</p>
      <a class="map-link" href={osmUrl} target="_blank" rel="noreferrer">
        <Icon name="map-pin" size={14} /> Ver en OpenStreetMap
      </a>
    </section>

    <section>
      <h3>Historial</h3>
      {#if !history}
        <p class="muted">Cargando historial…</p>
      {:else if history.length === 0}
        <p class="muted">Sin actividad registrada.</p>
      {:else}
        <ol class="timeline">
          {#each history as item (item.id)}
            <li>
              <span class="dot"></span>
              <div>
                <p class="strong">{item.accion}</p>
                <p>{item.descripcion}</p>
                <p class="muted">{fecha.format(new Date(item.fecha))} · {item.usuario}</p>
              </div>
            </li>
          {/each}
        </ol>
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

  dd.overdue {
    color: #b45309;
  }

  .map-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 13px;
  }

  .timeline {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .timeline li {
    position: relative;
    display: flex;
    gap: 12px;
    padding-bottom: 16px;
  }

  .timeline li:not(:last-child)::before {
    content: '';
    position: absolute;
    top: 14px;
    bottom: 0;
    left: 4px;
    width: 1px;
    background: var(--border-default);
  }

  .dot {
    flex-shrink: 0;
    width: 9px;
    height: 9px;
    margin-top: 6px;
    border-radius: 50%;
    background: var(--brand-500);
    box-shadow: 0 0 0 3px var(--brand-50);
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

  .status.seguimiento {
    color: #b45309;
    background: #fffbeb;
  }

  .status.inactivo {
    color: var(--text-muted);
  }
</style>
