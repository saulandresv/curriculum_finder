// frontend/src/App.tsx
import { useMapStore } from './store/mapStore'
import { useBusinessSearch } from './hooks/useBusinessSearch'
import { MapView } from './components/Map/MapContainer'
import { FilterBar } from './components/Overlay/FilterBar'
import { ResultsBar } from './components/Overlay/ResultsBar'

export default function App() {
  const circle      = useMapStore((s) => s.circle)
  const activeTypes = useMapStore((s) => s.activeTypes)

  const { data: businesses = [], isLoading, isError } = useBusinessSearch()

  const filtered = businesses.filter((b) => activeTypes.includes(b.type))

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <MapView filteredBusinesses={filtered} />

      <div className="overlay overlay--top">
        <FilterBar />
      </div>

      {circle && (
        <div className="overlay overlay--bottom">
          <ResultsBar
            businesses={filtered}
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      )}

      {!circle && (
        <div className="map-hint">
          <span className="map-hint__text">DIBUJA UN ÁREA EN EL MAPA</span>
        </div>
      )}
    </div>
  )
}
