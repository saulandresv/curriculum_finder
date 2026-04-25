// frontend/src/components/Overlay/FilterBar.tsx
import { useMapStore } from '../../store/mapStore'
import type { BusinessType } from '../../types'

const TYPES: { type: BusinessType; label: string }[] = [
  { type: 'office',     label: 'OFICINA' },
  { type: 'restaurant', label: 'RESTÓ'   },
  { type: 'cafe',       label: 'CAFÉ'    },
  { type: 'shop',       label: 'SHOP'    },
  { type: 'bank',       label: 'BANCO'   },
  { type: 'hotel',      label: 'HOTEL'   },
]

export function FilterBar() {
  const activeTypes = useMapStore((s) => s.activeTypes)
  const toggleType  = useMapStore((s) => s.toggleType)

  return (
    <div className="filter-bar">
      <span className="filter-bar__label">ZONA:</span>
      {TYPES.map(({ type, label }) => (
        <button
          key={type}
          className={`filter-tag${activeTypes.includes(type) ? ' filter-tag--active' : ''}`}
          onClick={() => toggleType(type)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
