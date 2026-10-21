<script lang="ts">
  import L from 'leaflet'
  import { onMount } from 'svelte'
  import { Tween } from 'svelte/motion'
  import { ROUTE_COLOR, createMap, dashedRoute, numberIcon, pinIcon, truckIcon } from '../../lib/map/leaflet'
  import { getRoute } from '../../lib/services/routing'
  import { dashboard } from '../../lib/stores/dashboard.svelte'
  import type { LatLng } from '../../lib/types'
  import { pointAlong, splitAt } from '../../lib/utils/geo'

  let container: HTMLDivElement
  let map: L.Map | undefined = $state()

  /** Geometría por calles de cada tramo, por id de entrega. */
  let paths = $state<Record<string, LatLng[]>>({})

  let active = $derived(dashboard.activeDelivery)
  let activePath = $derived(active ? (paths[active.id] ?? [active.from, active.to]) : [])

  // El avance llega cada segundo; se interpola para que el camión se mueva suave.
  const progress = new Tween(0, { duration: 1000 })
  let trackedId: string | null = null

  // Capas persistentes del tramo activo.
  let doneLine: L.Polyline
  let todoLine: L.Polyline
  let originMarker: L.CircleMarker
  let truckMarker: L.Marker
  let stopsLayer: L.LayerGroup
  let pendingLayer: L.LayerGroup

  onMount(() => {
    const instance = createMap(container)

    pendingLayer = L.layerGroup().addTo(instance)
    doneLine = L.polyline([], { color: ROUTE_COLOR, weight: 4, opacity: 0.25 }).addTo(instance)
    todoLine = L.polyline([], dashedRoute()).addTo(instance)
    originMarker = L.circleMarker([0, 0], {
      radius: 8,
      color: ROUTE_COLOR,
      weight: 4,
      fillColor: '#fff',
      fillOpacity: 1,
    }).addTo(instance)
    stopsLayer = L.layerGroup().addTo(instance)
    truckMarker = L.marker([0, 0], {
      icon: truckIcon(),
      zIndexOffset: 1000,
      interactive: false,
    }).addTo(instance)

    const points = dashboard.deliveries.flatMap((d) => [d.from, d.to])
    if (points.length) {
      instance.fitBounds(L.latLngBounds(points), { paddingTopLeft: [40, 110], paddingBottomRight: [40, 40] })
    } else {
      instance.setView(dashboard.depot, 13)
    }

    map = instance
    return () => instance.remove()
  })

  // Pide la geometría real de cada tramo nuevo.
  $effect(() => {
    for (const d of dashboard.deliveries) {
      if (paths[d.id]) continue
      const id = d.id
      getRoute(d.from, d.to).then((path) => {
        paths[id] = path
      })
    }
  })

  // Tramos pendientes y marcadores de destino (no dependen del avance).
  $effect(() => {
    if (!map) return
    pendingLayer.clearLayers()
    stopsLayer.clearLayers()
    const selectedId = dashboard.selectedDelivery?.id

    dashboard.deliveries.forEach((d, i) => {
      if (d.status !== 'en_camino') {
        L.polyline(paths[d.id] ?? [d.from, d.to], { ...dashedRoute(0.35), weight: 3 }).addTo(pendingLayer)
      }

      const selected = d.id === selectedId
      const icon = selected ? pinIcon() : numberIcon(i + 1)

      L.marker(d.to, { icon, zIndexOffset: selected ? 900 : 0, title: d.cliente })
        .on('click', () => dashboard.selectDelivery(d.id))
        .addTo(stopsLayer)
    })
  })

  // Sincroniza el tween con el avance que reporta el servidor.
  $effect(() => {
    if (!active) return
    if (active.id !== trackedId) {
      trackedId = active.id
      progress.set(active.progress, { duration: 0 })
    } else {
      progress.target = active.progress
    }
  })

  // Mueve el camión y parte la ruta en recorrido / pendiente.
  $effect(() => {
    if (!map) return
    const visible = !!active
    truckMarker.setOpacity(visible ? 1 : 0)
    originMarker.setStyle({ opacity: visible ? 1 : 0, fillOpacity: visible ? 1 : 0 })
    if (!active) {
      doneLine.setLatLngs([])
      todoLine.setLatLngs([])
      return
    }
    const [done, todo] = splitAt(activePath, progress.current)
    doneLine.setLatLngs(done)
    todoLine.setLatLngs(todo)
    originMarker.setLatLng(active.from)
    truckMarker.setLatLng(pointAlong(activePath, progress.current))
  })

  // Al seleccionar otra entrega, encuadra su tramo.
  let lastSelected: string | undefined
  $effect(() => {
    const selected = dashboard.selectedDelivery
    if (!map || !selected) return
    if (lastSelected && lastSelected !== selected.id) {
      map.flyToBounds(L.latLngBounds([selected.from, selected.to]), {
        paddingTopLeft: [40, 110],
        paddingBottomRight: [40, 90],
        maxZoom: 15,
        duration: 0.8,
      })
    }
    lastSelected = selected.id
  })
</script>

<div class="map" bind:this={container}></div>

<style>
  .map {
    position: absolute;
    inset: 0;
  }
</style>
