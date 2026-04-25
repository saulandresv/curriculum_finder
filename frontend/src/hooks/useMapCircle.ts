// frontend/src/hooks/useMapCircle.ts
import { useMapStore } from '../store/mapStore'

export function useMapCircle() {
  const circle = useMapStore((s) => s.circle)
  const setCircle = useMapStore((s) => s.setCircle)
  return { circle, setCircle }
}
