// frontend/src/components/Overlay/ResultsBar.tsx
import type { Business } from '../../types'
import { useMapStore } from '../../store/mapStore'

interface Props {
  businesses: Business[]
  isLoading: boolean
  isError: boolean
}

export function ResultsBar({ businesses, isLoading, isError }: Props) {
  const selectedId      = useMapStore((s) => s.selectedId)
  const selectBusiness  = useMapStore((s) => s.selectBusiness)

  if (isLoading) {
    return (
      <div className="results-bar">
        <p className="results-bar__message">Buscando...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="results-bar results-bar--error">
        <p className="results-bar__message">Error al buscar — intenta de nuevo</p>
      </div>
    )
  }

  if (businesses.length === 0) {
    return (
      <div className="results-bar">
        <p className="results-bar__message">Sin resultados en esta área</p>
      </div>
    )
  }

  return (
    <div className="results-bar">
      <div className="results-bar__count">{businesses.length} RESULTADOS</div>
      <div className="results-bar__scroll">
        {businesses.map((b) => (
          <button
            key={b.id}
            className={`result-item${selectedId === b.id ? ' result-item--selected' : ''}`}
            onClick={() => selectBusiness(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>
    </div>
  )
}
