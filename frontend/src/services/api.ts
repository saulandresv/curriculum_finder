// frontend/src/services/api.ts
import type { Business } from '../types'

export type SearchParams = {
  lat: number
  lon: number
  radius: number
  type: string
}

export async function fetchBusinesses(params: SearchParams): Promise<Business[]> {
  const url = new URL('/api/search', window.location.origin)
  url.searchParams.set('lat', String(params.lat))
  url.searchParams.set('lon', String(params.lon))
  url.searchParams.set('radius', String(params.radius))
  url.searchParams.set('type', params.type)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.json()
}
