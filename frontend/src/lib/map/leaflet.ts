import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './map.css'

// Piezas compartidas de los mapas (OpenStreetMap + Leaflet).

export const ROUTE_COLOR = '#059669' // --brand-600

const TRUCK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`
const PIN_SVG = `<svg width="38" height="48" viewBox="0 0 38 48"><path fill="${ROUTE_COLOR}" d="M19 0C8.5 0 0 8.4 0 18.8 0 32.9 19 48 19 48s19-15.1 19-29.2C38 8.4 29.5 0 19 0Z"/><circle cx="19" cy="18.5" r="7" fill="#fff"/></svg>`
const DEPOT_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M8 21v-7h8v7"/></svg>`

/** Crea un mapa con la capa base de OpenStreetMap y el estilo de la marca. */
export function createMap(container: HTMLElement): L.Map {
  const map = L.map(container, { zoomControl: false, scrollWheelZoom: false })
  container.classList.add('k-map')
  L.control.zoom({ position: 'topright' }).addTo(map)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  // Si el contenedor cambia de tamaño después de crear el mapa (layout que termina de
  // acomodarse, menú lateral que se contrae…), Leaflet necesita recalcular sus teselas.
  const observer = new ResizeObserver(() => map.invalidateSize())
  observer.observe(container)
  map.on('unload', () => observer.disconnect())

  return map
}

export const pinIcon = () => L.divIcon({ className: 'k-pin', html: PIN_SVG, iconSize: [38, 48], iconAnchor: [19, 46] })

export const numberIcon = (n: number) =>
  L.divIcon({ className: 'k-dot', html: String(n), iconSize: [26, 26], iconAnchor: [13, 13] })

export const truckIcon = () =>
  L.divIcon({ className: 'k-truck', html: TRUCK_SVG, iconSize: [40, 40], iconAnchor: [20, 20] })

export const depotIcon = () =>
  L.divIcon({ className: 'k-depot', html: DEPOT_SVG, iconSize: [30, 30], iconAnchor: [15, 15] })

export const dashedRoute = (opacity = 1): L.PolylineOptions => ({
  color: ROUTE_COLOR,
  weight: 4,
  opacity,
  dashArray: '2 10',
  lineCap: 'round',
})
