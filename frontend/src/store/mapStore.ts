import { create } from 'zustand'
import type { BusinessType, MapStore } from '../types'

export const useMapStore = create<MapStore>((set) => ({
  circle: null,
  activeTypes: ['office', 'restaurant', 'cafe', 'shop', 'bank', 'hotel'],
  selectedId: null,

  setCircle: (circle) => set({ circle, selectedId: null }),

  toggleType: (type: BusinessType) =>
    set((state) => ({
      activeTypes: state.activeTypes.includes(type)
        ? state.activeTypes.filter((t) => t !== type)
        : [...state.activeTypes, type],
    })),

  selectBusiness: (id) => set({ selectedId: id }),
}))
