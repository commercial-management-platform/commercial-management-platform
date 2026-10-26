import type { LatLng } from '../types'

// Geocodificación con Nominatim (OpenStreetMap). Devuelve null si no encuentra
// la dirección o el servicio no responde; quien llama decide el respaldo.

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export async function geocode(direccion: string, municipio: string, departamento: string): Promise<LatLng | null> {
  const params = new URLSearchParams({
    q: `${direccion}, ${municipio}, ${departamento}, Colombia`,
    format: 'json',
    limit: '1',
    countrycodes: 'co',
  })
  try {
    const response = await fetch(`${NOMINATIM}?${params}`, {
      headers: { 'Accept-Language': 'es' },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    const [first] = (await response.json()) as { lat: string; lon: string }[]
    return first ? [Number(first.lat), Number(first.lon)] : null
  } catch {
    return null
  }
}
