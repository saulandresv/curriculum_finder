// frontend/src/components/Map/MapContainer.tsx
import { MapContainer as LeafletMapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './leafletIconFix'
import { CircleSelector } from './CircleSelector'
import { BusinessPin } from './BusinessPin'
import { useMapStore } from '../../store/mapStore'
import type { Business } from '../../types'

interface Props {
  filteredBusinesses: Business[]
}

export function MapView({ filteredBusinesses }: Props) {
  const setCircle = useMapStore((s) => s.setCircle)
  const selectedId = useMapStore((s) => s.selectedId)
  const selectBusiness = useMapStore((s) => s.selectBusiness)

  return (
    <LeafletMapContainer
      center={[-33.45, -70.65]}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <CircleSelector
        onCircleDrawn={(lat, lon, radius) =>
          setCircle({ center: { lat, lon }, radiusMeters: radius })
        }
      />
      {filteredBusinesses.map((b) => (
        <BusinessPin
          key={b.id}
          business={b}
          isSelected={selectedId === b.id}
          onSelect={selectBusiness}
        />
      ))}
    </LeafletMapContainer>
  )
}
