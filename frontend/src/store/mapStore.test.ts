// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { useMapStore } from './mapStore'

beforeEach(() => {
  useMapStore.setState({
    circle: null,
    activeTypes: ['office', 'restaurant', 'cafe', 'shop', 'bank', 'hotel'],
    selectedId: null,
  })
})

describe('mapStore', () => {
  it('setCircle actualiza circle y limpia selectedId', () => {
    useMapStore.getState().selectBusiness('abc')
    useMapStore.getState().setCircle({ center: { lat: -33.45, lon: -70.65 }, radiusMeters: 500 })
    const { circle, selectedId } = useMapStore.getState()
    expect(circle?.radiusMeters).toBe(500)
    expect(selectedId).toBeNull()
  })

  it('setCircle con null limpia el círculo', () => {
    useMapStore.getState().setCircle({ center: { lat: -33.45, lon: -70.65 }, radiusMeters: 200 })
    useMapStore.getState().setCircle(null)
    expect(useMapStore.getState().circle).toBeNull()
  })

  it('toggleType desactiva un tipo activo', () => {
    useMapStore.getState().toggleType('office')
    expect(useMapStore.getState().activeTypes).not.toContain('office')
  })

  it('toggleType activa un tipo inactivo', () => {
    useMapStore.getState().toggleType('office')
    useMapStore.getState().toggleType('office')
    expect(useMapStore.getState().activeTypes).toContain('office')
  })

  it('selectBusiness actualiza selectedId', () => {
    useMapStore.getState().selectBusiness('node/123')
    expect(useMapStore.getState().selectedId).toBe('node/123')
  })

  it('selectBusiness con null limpia selección', () => {
    useMapStore.getState().selectBusiness('node/123')
    useMapStore.getState().selectBusiness(null)
    expect(useMapStore.getState().selectedId).toBeNull()
  })
})
