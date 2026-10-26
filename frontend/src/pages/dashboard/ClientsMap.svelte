<script lang="ts">
  import L from 'leaflet'
  import { onMount } from 'svelte'
  import { ROUTE_COLOR, createMap } from '../../lib/map/leaflet'
  import { clientDisplayName, type ApiClient } from '../../lib/services/clientsApi'

  let { clients }: { clients: ApiClient[] } = $props()

  const BARRANQUILLA: L.LatLngTuple = [10.9685, -74.7813]

  let container: HTMLDivElement
  let map: L.Map | undefined = $state()
  let layer: L.LayerGroup

  onMount(() => {
    const instance = createMap(container)
    instance.setView(BARRANQUILLA, 11)
    layer = L.layerGroup().addTo(instance)
    map = instance
    return () => instance.remove()
  })

  // Un punto por cliente con coordenadas; los inactivos en gris.
  let lastKey = ''
  $effect(() => {
    if (!map) return
    const located = clients.filter((c) => c.latitude !== null && c.longitude !== null)
    layer.clearLayers()
    for (const client of located) {
      L.circleMarker([client.latitude!, client.longitude!], {
        radius: 7,
        weight: 2,
        color: '#fff',
        fillColor: client.active ? ROUTE_COLOR : '#94a3b8',
        fillOpacity: 1,
      })
        .bindTooltip(
          `<strong>${escapeHtml(clientDisplayName(client))}</strong><br>${escapeHtml(
            [client.neighborhood, client.municipality].filter(Boolean).join(', '),
          )}${client.active ? '' : '<br><em>Inactivo</em>'}`,
          { direction: 'top', offset: [0, -6] },
        )
        .addTo(layer)
    }

    // Solo se reencuadra si cambia el conjunto de clientes, no en cada consulta.
    const key = located.map((c) => c.id).join(',')
    if (key !== lastKey && located.length) {
      lastKey = key
      map.fitBounds(L.latLngBounds(located.map((c) => [c.latitude!, c.longitude!])), {
        padding: [30, 30],
        maxZoom: 14,
      })
    }
  })

  function escapeHtml(text: string) {
    return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  }
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
</style>
