<script lang="ts" module>
  import type { ApiVisit } from '../../services/visitsApi'

  export interface MapStop {
    visit: ApiVisit
    /** Número que se muestra (orden en la ruta). */
    order: number
    latitude: number
    longitude: number
    label: string
  }
</script>

<script lang="ts">
  import L from 'leaflet'
  import { onMount } from 'svelte'
  import { createMap, dashedRoute } from '../../map/leaflet'

  // Mapa de las visitas de un día (HU-11): un marcador numerado por visita con el
  // color de su estado y una línea que las une en el orden de la ruta.
  // Reutilizable: lo usan el dashboard (HU-15) y cualquier vista de agenda.

  interface Props {
    /** Ya ordenadas como la ruta; solo las que tienen coordenadas. */
    stops: MapStop[]
    selectedId?: number | null
    onselect?: (visitId: number) => void
  }

  let { stops, selectedId = null, onselect }: Props = $props()

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

  const icon = (stop: MapStop, selected: boolean) =>
    L.divIcon({
      className: `k-visit ${stop.visit.status}${selected ? ' selected' : ''}`,
      html: String(stop.order),
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

  let lastKey = ''
  $effect(() => {
    if (!map) return
    layer.clearLayers()

    // El recorrido no pasa por las visitas canceladas.
    const path = stops.filter((s) => s.visit.status !== 'cancelled').map((s): L.LatLngTuple => [s.latitude, s.longitude])
    if (path.length > 1) L.polyline(path, dashedRoute(0.85)).addTo(layer)

    for (const stop of stops) {
      const selected = stop.visit.id === selectedId
      L.marker([stop.latitude, stop.longitude], {
        icon: icon(stop, selected),
        zIndexOffset: selected ? 1000 : 0,
        title: stop.label,
        keyboard: true,
      })
        .on('click', () => onselect?.(stop.visit.id))
        .addTo(layer)
    }

    // Solo se reencuadra si cambia el conjunto de visitas, no en cada consulta.
    const key = stops.map((s) => s.visit.id).join(',')
    if (key !== lastKey && stops.length) {
      lastKey = key
      // Sin animación: si el mapa se desmonta a mitad del zoom, Leaflet falla al terminarlo.
      map.fitBounds(L.latLngBounds(stops.map((s) => [s.latitude, s.longitude])), {
        padding: [40, 40],
        maxZoom: 15,
        animate: false,
      })
    }
  })

  // Al elegir una visita desde la lista, el mapa la centra.
  $effect(() => {
    const stop = stops.find((s) => s.visit.id === selectedId)
    if (map && stop) map.panTo([stop.latitude, stop.longitude])
  })
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
</style>
