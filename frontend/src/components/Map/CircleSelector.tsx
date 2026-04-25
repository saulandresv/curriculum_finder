// frontend/src/components/Map/CircleSelector.tsx
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'

interface Props {
  onCircleDrawn: (lat: number, lon: number, radius: number) => void
}

export function CircleSelector({ onCircleDrawn }: Props) {
  const map = useMap()

  useEffect(() => {
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    const drawControl = new L.Control.Draw({
      draw: {
        circle: {
          shapeOptions: {
            color: '#000000',
            weight: 2,
            dashArray: '6 4',
            fillOpacity: 0.03,
          },
        },
        rectangle: false,
        polygon: false,
        polyline: false,
        marker: false,
        circlemarker: false,
      },
      edit: { featureGroup: drawnItems },
    })

    map.addControl(drawControl)

    const handleCreated = (e: L.DrawEvents.Created) => {
      drawnItems.clearLayers()
      drawnItems.addLayer(e.layer)
      const circle = e.layer as L.Circle
      const { lat, lng } = circle.getLatLng()
      const radius = Math.round(circle.getRadius())
      onCircleDrawn(lat, lng, radius)
    }

    map.on(L.Draw.Event.CREATED, handleCreated)

    return () => {
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
      map.off(L.Draw.Event.CREATED, handleCreated)
    }
  }, [map, onCircleDrawn])

  return null
}
