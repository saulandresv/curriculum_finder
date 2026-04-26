// frontend/src/hooks/useBusinessSearch.ts
import { useQuery } from '@tanstack/react-query'
import { fetchBusinesses } from '../services/api'
import { useMapStore } from '../store/mapStore'
import type { Business } from '../types'

export function useBusinessSearch() {
  const circle = useMapStore((s) => s.circle)

  return useQuery<Business[]>({
    queryKey: ['businesses', circle],
    queryFn: () => {
      if (!circle) return []
      return fetchBusinesses({
        lat: circle.center.lat,
        lon: circle.center.lon,
        radius: circle.radiusMeters,
        type: 'all',
      })
    },
    enabled: circle !== null,
    staleTime: 60_000,
  })
}
