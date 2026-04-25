// frontend/src/components/Map/BusinessPin.tsx
import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import L from 'leaflet'
import type { Business } from '../../types'

const TYPE_COLORS: Record<string, string> = {
  office:     '#7c3aed',
  restaurant: '#ff3f00',
  cafe:       '#f59e0b',
  shop:       '#06b6d4',
  bank:       '#16a34a',
  hotel:      '#ec4899',
  other:      '#6b7280',
}

function makeIcon(type: string, selected: boolean): L.DivIcon {
  const color = TYPE_COLORS[type] ?? '#6b7280'
  const size = selected ? 16 : 10
  const inner = selected
    ? `background:${color};box-shadow:0 0 0 2px #000,0 0 8px ${color};`
    : `background:#fff;border:2px solid #000;`
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      border-radius:50%;
      ${inner}
      transition:all 0.15s;
      cursor:pointer;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

interface Props {
  business: Business
  isSelected: boolean
  onSelect: (id: string) => void
}

export function BusinessPin({ business, isSelected, onSelect }: Props) {
  const icon = useMemo(
    () => makeIcon(business.type, isSelected),
    [business.type, isSelected]
  )

  return (
    <Marker
      position={[business.lat, business.lon]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(business.id) }}
    />
  )
}
