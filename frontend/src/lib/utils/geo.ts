import type { LatLng } from '../types'

const R = 6371e3

/** Distancia en metros entre dos puntos (haversine). */
export function distance([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Punto ubicado en `t` (0..1) de la longitud total de una polilínea. */
export function pointAlong(path: LatLng[], t: number): LatLng {
  if (path.length === 0) return [0, 0]
  if (path.length === 1 || t <= 0) return path[0]
  if (t >= 1) return path[path.length - 1]

  const segments = path.slice(1).map((p, i) => distance(path[i], p))
  let remaining = segments.reduce((a, b) => a + b, 0) * t

  for (let i = 0; i < segments.length; i++) {
    if (remaining <= segments[i]) {
      const k = segments[i] === 0 ? 0 : remaining / segments[i]
      const [a, b] = [path[i], path[i + 1]]
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
    }
    remaining -= segments[i]
  }
  return path[path.length - 1]
}

/** Divide la polilínea en el tramo recorrido y el pendiente. */
export function splitAt(path: LatLng[], t: number): [LatLng[], LatLng[]] {
  if (path.length < 2) return [path, path]
  const point = pointAlong(path, t)
  const segments = path.slice(1).map((p, i) => distance(path[i], p))
  let remaining = segments.reduce((a, b) => a + b, 0) * Math.min(Math.max(t, 0), 1)
  let index = 0
  while (index < segments.length && remaining > segments[index]) {
    remaining -= segments[index]
    index++
  }
  return [[...path.slice(0, index + 1), point], [point, ...path.slice(index + 1)]]
}
