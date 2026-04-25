// @vitest-environment happy-dom
// frontend/src/components/Overlay/FilterBar.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'
import { useMapStore } from '../../store/mapStore'

beforeEach(() => {
  useMapStore.setState({
    circle: null,
    activeTypes: ['office', 'restaurant', 'cafe', 'shop', 'bank', 'hotel'],
    selectedId: null,
  })
})

describe('FilterBar', () => {
  it('renderiza todos los tipos de empresa', () => {
    render(<FilterBar />)
    expect(screen.getByText('OFICINA')).toBeInTheDocument()
    expect(screen.getByText('RESTÓ')).toBeInTheDocument()
    expect(screen.getByText('CAFÉ')).toBeInTheDocument()
    expect(screen.getByText('SHOP')).toBeInTheDocument()
    expect(screen.getByText('BANCO')).toBeInTheDocument()
    expect(screen.getByText('HOTEL')).toBeInTheDocument()
  })

  it('click en tipo activo lo desactiva', async () => {
    render(<FilterBar />)
    await userEvent.click(screen.getByText('OFICINA'))
    expect(useMapStore.getState().activeTypes).not.toContain('office')
  })

  it('click en tipo inactivo lo activa', async () => {
    useMapStore.setState({ activeTypes: [] })
    render(<FilterBar />)
    await userEvent.click(screen.getByText('CAFÉ'))
    expect(useMapStore.getState().activeTypes).toContain('cafe')
  })
})
