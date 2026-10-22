import type { LatLng, RouteLeg } from '../types'
import { distance } from '../utils/geo'

// Trazado de rutas por calles usando OSRM (datos de OpenStreetMap).
// Si el servicio no responde se usa una línea recta como respaldo.

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

/** Respaldo: distancia en línea recta con factor de calles y 25 km/h de velocidad urbana. */
const STREET_FACTOR = 1.35
const URBAN_SPEED = 25_000 / 3600 // m/s

export interface RoutePlan {
  path: LatLng[]
  legs: RouteLeg[]
}

const cache = new Map<string, Promise<RoutePlan>>()

/** Ruta por calles que pasa por todos los puntos en orden. */
export function getRouteThrough(points: LatLng[]): Promise<RoutePlan> {
  const key = points.map((p) => p.join(',')).join(';')
  let plan = cache.get(key)
  if (!plan) {
    plan = fetchPlan(points)
    cache.set(key, plan)
  }
  return plan
}

/** Ruta entre dos puntos (solo la geometría). */
export async function getRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
  return (await getRouteThrough([from, to])).path
}

export function estimateLeg(from: LatLng, to: LatLng): RouteLeg {
  const meters = distance(from, to) * STREET_FACTOR
  return { distance: meters, duration: meters / URBAN_SPEED }
}

async function fetchPlan(points: LatLng[]): Promise<RoutePlan> {
  if (points.length < 2) return { path: points, legs: [] }
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';')
  try {
    const response = await fetch(`${OSRM}/${coords}?overview=full&geometries=geojson`, {
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) throw new Error(`OSRM ${response.status}`)
    const route = (await response.json()).routes?.[0]
    const line: [number, number][] = route?.geometry?.coordinates ?? []
    if (line.length < 2) throw new Error('Ruta vacía')
    return {
      path: line.map(([lng, lat]) => [lat, lng]),
      legs: route.legs.map((leg: RouteLeg) => ({ distance: leg.distance, duration: leg.duration })),
    }
  } catch {
    cache.delete(points.map((p) => p.join(',')).join(';'))
    return { path: points, legs: points.slice(1).map((p, i) => estimateLeg(points[i], p)) }
  }
}
