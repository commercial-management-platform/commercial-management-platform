<script lang="ts">
  import L from 'leaflet'
  import { onMount } from 'svelte'
  import { createMap, dashedRoute, depotIcon, numberIcon, pinIcon } from '../../lib/map/leaflet'
  import { planner } from '../../lib/stores/routePlanner.svelte'
  import type { LatLng } from '../../lib/types'

  let container: HTMLDivElement
  let map: L.Map | undefined = $state()
  let routeLine: L.Polyline
  let stopsLayer: L.LayerGroup

  onMount(() => {
    const instance = createMap(container)
    instance.setView(planner.depot, 13)
    routeLine = L.polyline([], dashedRoute()).addTo(instance)
    stopsLayer = L.layerGroup().addTo(instance)
    L.marker(planner.depot, { icon: depotIcon(), title: 'Bodega · punto de partida', zIndexOffset: 500 }).addTo(instance)
    map = instance
    return () => instance.remove()
  })

  // Trazado: la ruta real por calles o, mientras se calcula, líneas rectas.
  $effect(() => {
    if (!map) return
    const straight: LatLng[] = [planner.depot, ...planner.schedule.map((s) => s.client.coords)]
    routeLine.setLatLngs(planner.path.length ? planner.path : straight.length > 1 ? straight : [])
    routeLine.setStyle({ opacity: planner.routing ? 0.45 : 1 })
  })

  // Marcadores numerados; la parada seleccionada se muestra como pin.
  $effect(() => {
    if (!map) return
    stopsLayer.clearLayers()
    const selectedId = planner.selected?.clientId
    planner.schedule.forEach((stop, i) => {
      const selected = stop.clientId === selectedId
      L.marker(stop.client.coords, {
        icon: selected ? pinIcon() : numberIcon(i + 1),
        zIndexOffset: selected ? 900 : 0,
        title: stop.client.nombre,
      })
        .on('click', () => planner.select(stop.clientId))
        .addTo(stopsLayer)
    })
  })

  // Encuadra toda la ruta cuando cambian las paradas o su orden.
  let lastKey: string | null = null
  $effect(() => {
    if (!map) return
    const key = planner.stops.map((s) => s.clientId).join(',')
    if (key === lastKey) return
    const first = lastKey === null
    lastKey = key
    const points = [planner.depot, ...planner.schedule.map((s) => s.client.coords)]
    if (points.length < 2) return
    const options = { paddingTopLeft: [40, 120], paddingBottomRight: [40, 100], maxZoom: 15 } as L.FitBoundsOptions
    if (first) map.fitBounds(L.latLngBounds(points), options)
    else map.flyToBounds(L.latLngBounds(points), { ...options, duration: 0.6 })
  })

  // Al elegir otra parada, la acerca si quedó fuera de vista.
  let lastSelected: number | undefined
  $effect(() => {
    const stop = planner.selected
    if (!map || !stop) return
    if (lastSelected && lastSelected !== stop.clientId) {
      map.panInside(stop.client.coords, { paddingTopLeft: [40, 130], paddingBottomRight: [40, 110] })
    }
    lastSelected = stop.clientId
  })
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
</style>
