// frontend/src/types/index.ts
export type BusinessType =
  | 'office'
  | 'restaurant'
  | 'cafe'
  | 'shop'
  | 'bank'
  | 'hotel'
  | 'other'

export type Business = {
  id: string
  name: string
  type: BusinessType
  lat: number
  lon: number
  address?: string
}

export type MapCircle = {
  center: { lat: number; lon: number }
  radiusMeters: number
}

export type MapStore = {
  circle: MapCircle | null
  activeTypes: BusinessType[]
  selectedId: string | null
  setCircle: (c: MapCircle | null) => void
  toggleType: (t: BusinessType) => void
  selectBusiness: (id: string | null) => void
}
