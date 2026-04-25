// @vitest-environment happy-dom
// frontend/src/components/Overlay/ResultsBar.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResultsBar } from './ResultsBar'
import { useMapStore } from '../../store/mapStore'
import type { Business } from '../../types'

const BUSINESSES: Business[] = [
  { id: 'node/1', name: 'TechCorp', type: 'office', lat: -33.45, lon: -70.65 },
  { id: 'node/2', name: 'Café Sur',  type: 'cafe',   lat: -33.46, lon: -70.66 },
]

beforeEach(() => {
  useMapStore.setState({ selectedId: null })
})

describe('ResultsBar', () => {
  it('muestra lista de empresas', () => {
    render(<ResultsBar businesses={BUSINESSES} isLoading={false} isError={false} />)
    expect(screen.getByText('TechCorp')).toBeInTheDocument()
    expect(screen.getByText('Café Sur')).toBeInTheDocument()
  })

  it('muestra cantidad de resultados', () => {
    render(<ResultsBar businesses={BUSINESSES} isLoading={false} isError={false} />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('click en empresa la selecciona en el store', async () => {
    render(<ResultsBar businesses={BUSINESSES} isLoading={false} isError={false} />)
    await userEvent.click(screen.getByText('TechCorp'))
    expect(useMapStore.getState().selectedId).toBe('node/1')
  })

  it('empresa seleccionada tiene clase --selected', () => {
    useMapStore.setState({ selectedId: 'node/2' })
    render(<ResultsBar businesses={BUSINESSES} isLoading={false} isError={false} />)
    const item = screen.getByText('Café Sur').closest('button')
    expect(item).toHaveClass('result-item--selected')
  })

  it('muestra spinner cuando isLoading', () => {
    render(<ResultsBar businesses={[]} isLoading={true} isError={false} />)
    expect(screen.getByText(/buscando/i)).toBeInTheDocument()
  })

  it('muestra error cuando isError', () => {
    render(<ResultsBar businesses={[]} isLoading={false} isError={true} />)
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  it('muestra mensaje vacío cuando sin resultados', () => {
    render(<ResultsBar businesses={[]} isLoading={false} isError={false} />)
    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument()
  })
})
