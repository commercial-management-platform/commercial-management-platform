<script lang="ts">
  import { onMount } from 'svelte'
  import Icon, { type IconName } from '../../lib/components/Icon.svelte'
  import { POTENCIALES, clientStatusLabel } from '../../lib/domain/clients'
  import { DIAS, zonaLabel } from '../../lib/domain/routes'
  import { router } from '../../lib/router.svelte'
  import { api } from '../../lib/services/api'
  import { clientsStore, useLiveClients } from '../../lib/stores/clients.svelte'
  import { routesStore, useLiveRoutes } from '../../lib/stores/routes.svelte'
  import { session } from '../../lib/stores/session.svelte'
  import { toasts } from '../../lib/stores/toasts.svelte'
  import type { ClientContact, Potencial, VisitResult } from '../../lib/types'
  import { formatMoney, fromMinutes, toMinutes } from '../../lib/utils/format'

  useLiveClients()
  useLiveRoutes()

  const CANALES = ['Presencial', 'Telefónico', 'Videollamada', 'WhatsApp']
  const OBJETIVOS = ['Presentación de nueva línea', 'Seguimiento de cotización', 'Toma de pedido', 'Cobro de cartera', 'Servicio posventa', 'Prospección']
  const TIPOS_VISITA = ['Desarrollo de cliente', 'Mantenimiento', 'Recuperación', 'Primera visita']
  const ESTADOS = [
    { value: 'visitado', label: 'Visitado' },
    { value: 'reprogramado', label: 'Reprogramado' },
    { value: 'sin_visitar', label: 'No visitado' },
  ] as const
  const RESULTADOS: VisitResult[] = ['Interesado', 'Pedido', 'Sin interés']
  const HORAS = Array.from({ length: 29 }, (_, i) => fromMinutes(360 + i * 30))

  const isoDate = (date = new Date()) => {
    const d = new Date(date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }
  const addDays = (iso: string, days: number) => isoDate(new Date(Date.parse(`${iso}T12:00`) + days * 86_400_000))

  /** Número de semana ISO-8601. */
  function isoWeek(iso: string) {
    const d = new Date(`${iso}T12:00`)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const firstThursday = new Date(d.getFullYear(), 0, 4)
    return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
  }

  const emptyContact = (): ClientContact => ({ nombre: '', cargo: '', telefono: '', email: '' })

  let fecha = $state(isoDate())
  let horaInicio = $state('09:00')
  let horaFin = $state('10:00')
  let routeId = $state('')
  let asesorId = $state('')
  let clientId = $state('')
  let contacto = $state<ClientContact>(emptyContact())
  let canal = $state('Presencial')
  let objetivo = $state(OBJETIVOS[0])
  let tipoVisita = $state(TIPOS_VISITA[0])
  let potencial = $state<Potencial>('Medio')
  let estado = $state<'visitado' | 'reprogramado' | 'sin_visitar'>('visitado')
  let resultado = $state<VisitResult>('Interesado')
  let observaciones = $state('')
  let cotizacion = $state<number | null>(null)
  let pedido = $state(false)
  let entrega = $state(addDays(isoDate(), 5))
  let proxima = $state(false)
  let proximaFecha = $state(addDays(isoDate(), 15))
  let adjuntos = $state<string[]>([])
  let showErrors = $state(false)
  let saving = $state(false)

  let cotizacionInput = $state<HTMLInputElement>()
  let fileInput = $state<HTMLInputElement>()

  let client = $derived(clientId ? clientsStore.byId.get(clientId) : undefined)
  let recent = $derived(clientId ? (clientsStore.histories[clientId] ?? []).slice(0, 3) : [])
  let dia = $derived(DIAS[(new Date(`${fecha}T12:00`).getDay() + 6) % 7] ?? 'Domingo')
  let visited = $derived(estado === 'visitado')
  let clients = $derived(
    clientsStore.clients.filter((c) => c.estado !== 'inactivo').toSorted((a, b) => a.nombre.localeCompare(b.nombre)),
  )
  // Rutas donde está el cliente primero; luego las del asesor.
  let routeOptions = $derived(
    routesStore.routes
      .filter((r) => r.stops.some((s) => s.clientId === clientId) || r.asesorId === asesorId)
      .toSorted((a, b) => Number(b.stops.some((s) => s.clientId === clientId)) - Number(a.stops.some((s) => s.clientId === clientId))),
  )

  // Asesor por defecto: el usuario con sesión iniciada.
  $effect(() => {
    if (!asesorId && routesStore.asesores.length) {
      asesorId = routesStore.asesores.find((a) => a.nombre === session.current?.user.name)?.id ?? ''
    }
  })

  onMount(() => {
    if (router.params.cliente) selectClient(router.params.cliente)
  })

  /** Al elegir cliente se precargan sus datos, su historial y la ruta del día. */
  function selectClient(id: string) {
    clientId = id
    const c = clientsStore.byId.get(id)
    if (!c) return
    contacto = $state.snapshot(c.contacto)
    potencial = c.potencial
    proximaFecha = addDays(fecha, c.frecuenciaVisita)
    clientsStore.loadHistory(id)
    const route =
      routesStore.routes.find((r) => r.dia === dia && r.stops.some((s) => s.clientId === id)) ??
      routesStore.routes.find((r) => r.stops.some((s) => s.clientId === id))
    if (route) {
      routeId = route.id
      asesorId = route.asesorId
    }
  }

  // Si el cliente se eligió por URL antes de que cargaran los clientes, se completa al llegar.
  $effect(() => {
    if (clientId && clientsStore.status === 'ready' && !contacto.nombre) selectClient(clientId)
  })

  function selectRoute(id: string) {
    routeId = id
    const route = routesStore.routes.find((r) => r.id === id)
    if (route) asesorId = route.asesorId
  }

  let errors = $derived.by(() => {
    const e: Record<string, string> = {}
    if (!clientId) e.cliente = 'Selecciona el cliente visitado.'
    if (!asesorId) e.asesor = 'Selecciona el asesor.'
    if (fecha > isoDate()) e.fecha = 'Para fechas futuras usa “Programar visita”.'
    if (toMinutes(horaFin) <= toMinutes(horaInicio)) e.horaFin = 'Debe ser posterior a la hora de inicio.'
    if (!contacto.nombre.trim()) e.contacto = 'Indica con quién se habló.'
    if (visited && pedido && !(cotizacion && cotizacion > 0)) e.cotizacion = 'El pedido necesita un valor.'
    if (cotizacion !== null && cotizacion < 0) e.cotizacion = 'Valor inválido.'
    if (visited && pedido && entrega < fecha) e.entrega = 'La entrega no puede ser antes de la visita.'
    if (proxima && proximaFecha <= fecha) e.proxima = 'Debe ser posterior a esta visita.'
    return e
  })
  let err = $derived(showErrors ? errors : {})

  function generateQuote() {
    estado = 'visitado'
    cotizacionInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    cotizacionInput?.focus({ preventScroll: true })
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    adjuntos = [...adjuntos, ...Array.from(files, (f) => f.name)]
  }

  function reset() {
    clientId = ''
    contacto = emptyContact()
    routeId = ''
    observaciones = ''
    cotizacion = null
    pedido = proxima = false
    adjuntos = []
    estado = 'visitado'
    resultado = 'Interesado'
    showErrors = false
  }

  async function save(event: SubmitEvent) {
    event.preventDefault()
    showErrors = true
    if (Object.keys(errors).length) {
      document.querySelector<HTMLElement>('.visit-form .invalid')?.focus()
      return
    }
    saving = true
    try {
      const result = await api.registerVisit(
        {
          clientId,
          asesorId,
          routeId,
          fecha: new Date(`${fecha}T${horaInicio}`).toISOString(),
          horaFin,
          canal,
          objetivo,
          tipoVisita,
          potencial,
          estado,
          resultado: visited ? (pedido ? 'Pedido' : resultado) : 'No visitado',
          observaciones: observaciones.trim(),
          contacto: $state.snapshot(contacto),
          cotizacion: visited && cotizacion ? { valor: cotizacion } : null,
          pedido: visited && pedido ? { entrega: new Date(`${entrega}T14:00`).toISOString() } : null,
          proximaVisita: proxima ? new Date(`${proximaFecha}T09:00`).toISOString() : null,
          adjuntos: $state.snapshot(adjuntos),
        },
        session.current?.user.name ?? 'Usuario',
      )
      const docs = [result.quote?.numero, result.order?.numero].filter(Boolean).join(' · ')
      toasts.push({
        tone: 'success',
        icon: 'check',
        title: 'Visita guardada',
        message: `${client?.nombre}${docs ? ` · ${docs}` : ''}`,
      })
      reset()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      toasts.push({ tone: 'warning', icon: 'alert-circle', title: 'No se pudo guardar la visita', message: 'Intenta de nuevo.' })
    } finally {
      saving = false
    }
  }

  const historyIcon = (accion: string): IconName =>
    accion.startsWith('Visita') ? 'check' : accion.startsWith('Cotización') ? 'file-text' : 'activity'
  const dayMonth = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }
</script>

<div class="page">
  <header>
    <p class="eyebrow">Actividad comercial</p>
    <h1>Registrar visita</h1>
    <p class="subtitle">Completa la información de la visita realizada al cliente.</p>
  </header>

  <div class="layout">
    <form class="card visit-form" onsubmit={save} novalidate>
      <!-- 1. Información general -->
      <section>
        <h2><span class="step">1</span> Información general de la visita</h2>
        <div class="grid">
          <label class="field">
            <span>Fecha de visita</span>
            <input class="input" class:invalid={err.fecha} type="date" max={isoDate()} bind:value={fecha} />
            {#if err.fecha}<small>{err.fecha}</small>{/if}
          </label>
          <label class="field">
            <span>Hora inicio</span>
            <select class="select" bind:value={horaInicio}>
              {#each HORAS as h (h)}<option>{h}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Hora final</span>
            <select class="select" class:invalid={err.horaFin} bind:value={horaFin}>
              {#each HORAS as h (h)}<option>{h}</option>{/each}
            </select>
            {#if err.horaFin}<small>{err.horaFin}</small>{/if}
          </label>
          <label class="field">
            <span>Ruta</span>
            <select class="select" value={routeId} onchange={(e) => selectRoute(e.currentTarget.value)}>
              <option value="">Fuera de ruta</option>
              {#each routeOptions as r (r.id)}<option value={r.id}>{r.nombre} · {r.dia}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Territorio</span>
            <input class="input" readonly value={client ? zonaLabel(client.zona) : '—'} />
          </label>
          <label class="field">
            <span>Semana</span>
            <input class="input" readonly value={isoWeek(fecha)} />
          </label>
          <label class="field">
            <span>Día</span>
            <input class="input" readonly value={dia} />
          </label>
          <label class="field">
            <span>Asesor</span>
            <select class="select" class:invalid={err.asesor} bind:value={asesorId}>
              <option value="" disabled>Selecciona</option>
              {#each routesStore.asesores as a (a.id)}<option value={a.id}>{a.nombre}</option>{/each}
            </select>
          </label>
        </div>
      </section>

      <!-- 2. Información del cliente -->
      <section>
        <h2><span class="step">2</span> Información del cliente</h2>
        <div class="grid">
          <label class="field">
            <span>Cliente</span>
            <select class="select" class:invalid={err.cliente} value={clientId} onchange={(e) => selectClient(e.currentTarget.value)}>
              <option value="" disabled>Selecciona</option>
              {#each clients as c (c.id)}<option value={c.id}>{c.nombre}</option>{/each}
            </select>
            {#if err.cliente}<small>{err.cliente}</small>{/if}
          </label>
          <label class="field">
            <span>Código cliente</span>
            <input class="input" readonly value={client ? `CLI-${client.id.replace(/\D/g, '').padStart(6, '0')}` : '—'} />
          </label>
          <label class="field">
            <span>Tipo de cliente</span>
            <input class="input" readonly value={client?.tipo ?? '—'} />
          </label>
          <label class="field">
            <span>Municipio</span>
            <input class="input" readonly value={client?.municipio ?? '—'} />
          </label>
          <label class="field">
            <span>Contacto</span>
            <input class="input" class:invalid={err.contacto} bind:value={contacto.nombre} />
            {#if err.contacto}<small>{err.contacto}</small>{/if}
          </label>
          <label class="field">
            <span>Teléfono</span>
            <input class="input" bind:value={contacto.telefono} />
          </label>
          <label class="field">
            <span>Cargo</span>
            <input class="input" bind:value={contacto.cargo} />
          </label>
          <label class="field">
            <span>Canal de contacto</span>
            <select class="select" bind:value={canal}>
              {#each CANALES as c (c)}<option>{c}</option>{/each}
            </select>
          </label>
        </div>
      </section>

      <!-- 3. Resultado -->
      <section>
        <h2><span class="step">3</span> Resultado de la visita</h2>
        <div class="grid">
          <label class="field">
            <span>Objetivo</span>
            <select class="select" bind:value={objetivo}>
              {#each OBJETIVOS as o (o)}<option>{o}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Tipo de visita</span>
            <select class="select" bind:value={tipoVisita}>
              {#each TIPOS_VISITA as t (t)}<option>{t}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Potencial</span>
            <select class="select" bind:value={potencial}>
              {#each POTENCIALES as p (p)}<option>{p}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Estado</span>
            <select class="select" bind:value={estado}>
              {#each ESTADOS as e (e.value)}<option value={e.value}>{e.label}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Resultado</span>
            <select class="select" bind:value={resultado} disabled={!visited || pedido}>
              {#each RESULTADOS as r (r)}<option>{r}</option>{/each}
            </select>
          </label>
          <label class="field span-3">
            <span>Observaciones</span>
            <textarea class="input" rows="3" bind:value={observaciones} placeholder="Acuerdos, necesidades del cliente, próximos pasos…"></textarea>
          </label>
        </div>
      </section>

      <!-- 4. Gestión comercial -->
      <section class:disabled={!visited}>
        <h2><span class="step">4</span> Gestión comercial</h2>
        {#if !visited}<p class="hint">Solo aplica cuando la visita se realizó.</p>{/if}
        <div class="grid">
          <label class="field">
            <span>Número de cotización</span>
            <input class="input" readonly value={cotizacion ? 'Se asigna al guardar' : '—'} />
          </label>
          <label class="field">
            <span>Valor cotización</span>
            <input
              class="input"
              class:invalid={err.cotizacion}
              type="number"
              min="0"
              step="100"
              placeholder="$ 0"
              bind:this={cotizacionInput}
              bind:value={cotizacion}
              disabled={!visited}
            />
            {#if err.cotizacion}<small>{err.cotizacion}</small>{/if}
          </label>
          <label class="field">
            <span>Número de pedido</span>
            <input class="input" readonly value={pedido ? 'Se asigna al guardar' : '—'} />
          </label>
          <label class="field">
            <span>Fecha estimada de entrega</span>
            <input class="input" class:invalid={err.entrega} type="date" min={fecha} bind:value={entrega} disabled={!visited || !pedido} />
            {#if err.entrega}<small>{err.entrega}</small>{/if}
          </label>
        </div>
        <label class="check">
          <input type="checkbox" bind:checked={pedido} disabled={!visited} />
          Generar pedido a partir de esta visita
          {#if pedido && cotizacion}<strong>· {formatMoney(cotizacion)}</strong>{/if}
        </label>
        {#if proxima}
          <label class="field next-visit">
            <span>Próxima visita</span>
            <input class="input" class:invalid={err.proxima} type="date" min={addDays(fecha, 1)} bind:value={proximaFecha} />
            {#if err.proxima}<small>{err.proxima}</small>{/if}
          </label>
        {/if}
        {#if adjuntos.length}
          <ul class="files">
            {#each adjuntos as name, i (i)}
              <li>
                <Icon name="file-text" size={14} /> {name}
                <button type="button" onclick={() => adjuntos.splice(i, 1)} aria-label="Quitar {name}"><Icon name="x" size={12} /></button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>

      <footer>
        <button type="button" class="btn btn-outline" onclick={() => history.back()}>Cancelar</button>
        <button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar visita'}</button>
      </footer>
    </form>

    <aside class="side">
      <section class="card panel">
        <h3>Resumen del cliente</h3>
        {#if client}
          <div class="client">
            <span class="client-icon"><Icon name="briefcase" size={18} /></span>
            <div>
              <strong>{client.nombre}</strong>
              <span class="tag">Cliente {clientStatusLabel[client.estado].toLowerCase()}</span>
            </div>
          </div>
          <p class="meta">CLI-{client.id.replace(/\D/g, '').padStart(6, '0')}</p>
          <p class="meta">{zonaLabel(client.zona)} · {client.tipo}</p>
          <p class="meta">Potencial {client.potencial.toLowerCase()}</p>
        {:else}
          <p class="meta">Selecciona un cliente para ver su resumen.</p>
        {/if}
      </section>

      <section class="card panel">
        <h3>Últimas interacciones</h3>
        {#if !client}
          <p class="meta">Sin cliente seleccionado.</p>
        {:else if recent.length === 0}
          <p class="meta">Cargando…</p>
        {:else}
          <ol class="interactions">
            {#each recent as item (item.id)}
              <li>
                <span class="i-icon"><Icon name={historyIcon(item.accion)} size={14} /></span>
                <div>
                  <small>{dayMonth(item.fecha)}</small>
                  <strong>{item.accion}</strong>
                </div>
              </li>
            {/each}
          </ol>
        {/if}
      </section>

      <section class="card panel">
        <h3>Acciones rápidas</h3>
        <div class="quick">
          <button type="button" class:on={!!cotizacion} onclick={generateQuote}>
            <Icon name={cotizacion ? 'check' : 'chevron-right'} size={16} /> Generar cotización
          </button>
          <button type="button" class:on={pedido} onclick={() => ((pedido = !pedido), (estado = 'visitado'))}>
            <Icon name={pedido ? 'check' : 'chevron-right'} size={16} /> Crear pedido
          </button>
          <button type="button" class:on={proxima} onclick={() => (proxima = !proxima)}>
            <Icon name={proxima ? 'check' : 'chevron-right'} size={16} /> Programar próxima visita
          </button>
          <button type="button" class:on={adjuntos.length > 0} onclick={() => fileInput?.click()}>
            <Icon name={adjuntos.length ? 'check' : 'chevron-right'} size={16} /> Adjuntar documento
          </button>
          <input bind:this={fileInput} type="file" multiple hidden onchange={(e) => addFiles(e.currentTarget.files)} />
        </div>
      </section>
    </aside>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1220px;
  }

  h1 {
    margin-top: 8px;
    font-size: 32px;
    line-height: 40px;
    letter-spacing: -0.02em;
  }

  .subtitle {
    margin-top: 6px;
    color: var(--text-secondary);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    align-items: start;
    gap: 20px;
  }

  .visit-form {
    overflow: hidden;
  }

  .visit-form section {
    padding: 24px;
    transition: opacity 0.2s;
  }

  .visit-form section + section {
    border-top: 1px solid var(--border-default);
  }

  .visit-form section.disabled {
    opacity: 0.6;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    font-size: 15px;
    line-height: 22px;
  }

  .step {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    font: 700 11px var(--font-heading);
    color: var(--brand-700);
    border-radius: 6px;
    background: var(--brand-50);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .field > span {
    font: 600 12px/18px var(--font-heading);
  }

  .span-3 {
    grid-column: span 3;
  }

  .field .input,
  .field .select {
    width: 100%;
  }

  .input[readonly] {
    color: var(--text-secondary);
    background: var(--bg-surface-soft);
  }

  textarea.input {
    height: auto;
    padding: 10px 12px;
    resize: vertical;
  }

  .invalid {
    border-color: var(--danger);
  }

  small {
    font-size: 12px;
    color: var(--danger);
  }

  .hint {
    margin: -8px 0 14px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
    font-size: 13px;
    cursor: pointer;
  }

  .check input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--brand-600);
  }

  .next-visit {
    max-width: 240px;
    margin-top: 16px;
  }

  .files {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }

  .files li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px 4px 10px;
    font-size: 12px;
    border: 1px solid var(--border-default);
    border-radius: 999px;
  }

  .files button {
    display: grid;
    place-items: center;
    padding: 3px;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid var(--border-default);
    background: var(--bg-surface-soft);
  }

  footer .btn {
    height: 48px;
    padding: 0 22px;
    font-size: 15px;
  }

  /* --- Columna lateral --- */
  .side {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .panel {
    padding: 20px;
  }

  h3 {
    margin-bottom: 14px;
    font: 700 13px/20px var(--font-heading);
  }

  .client {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .client-icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    color: var(--brand-600);
    border-radius: 10px;
    background: var(--brand-50);
  }

  .client strong {
    display: block;
    font: 700 14px/20px var(--font-heading);
  }

  .tag {
    display: inline-block;
    margin-top: 4px;
    padding: 1px 8px;
    font: 700 10px/16px var(--font-heading);
    text-transform: uppercase;
    color: var(--brand-700);
    border-radius: 999px;
    background: var(--brand-50);
  }

  .meta {
    font-size: 12px;
    line-height: 22px;
    color: var(--text-muted);
  }

  .interactions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .interactions li {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .i-icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    color: var(--brand-600);
    border-radius: 50%;
    background: var(--brand-50);
  }

  .interactions small {
    display: block;
    font-size: 10px;
    color: var(--text-muted);
  }

  .interactions strong {
    font: 700 12px/16px var(--font-heading);
  }

  .quick {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .quick button {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 14px;
    font-size: 15px;
    text-align: left;
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .quick button:hover {
    border-color: var(--border-brand);
  }

  .quick button.on {
    color: var(--text-brand);
    border-color: var(--border-brand);
    background: var(--brand-50);
  }

  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .side {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
  }

  @media (max-width: 760px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }

    .span-3 {
      grid-column: 1 / -1;
    }
  }
</style>
