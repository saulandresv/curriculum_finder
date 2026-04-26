// frontend/src/views/MapCardView.tsx
import { useState, useEffect, useRef } from 'react'
import { MapContainer as LeafletMapContainer, TileLayer, useMap, Circle, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import '../components/Map/leafletIconFix'
import { fetchBusinesses } from '../services/api'
import type { Business } from '../types'
import { useBusinessStatus, type BusinessStatus } from '../hooks/useBusinessStatus'

type DrawnCircle = { center: L.LatLng; radius: number }

type PlacesData = {
  rating?: number
  ratings_total?: number
  phone?: string
  website?: string
  hours?: string[]
  photo_reference?: string
}

const TYPE_COLORS: Record<string, string> = {
  office: '#7c3aed',
  restaurant: '#ff3f00',
  cafe: '#f59e0b',
  tienda: '#06b6d4',
  supermercado: '#22c55e',
  ferreteria: '#d97706',
  panaderia: '#f97316',
  ropa: '#a855f7',
  bank: '#16a34a',
  hotel: '#ec4899',
  other: '#6b7280',
}

const TYPE_LABELS: Record<string, string> = {
  office: 'OFICINA',
  restaurant: 'RESTÓ',
  cafe: 'CAFÉ',
  tienda: 'TIENDA',
  supermercado: 'SÚPER',
  ferreteria: 'FERRET.',
  panaderia: 'PANAD.',
  ropa: 'ROPA',
  bank: 'BANCO',
  hotel: 'HOTEL',
  other: 'OTRO',
}

const ALL_TYPES = Object.keys(TYPE_COLORS)

const STATUS_CONFIG: Record<BusinessStatus, { label: string; color: string; bg: string }> = {
  interesado: { label: 'INTERESADO', color: '#7c3aed', bg: '#7c3aed18' },
  postule:    { label: 'POSTULÉ',    color: '#16a34a', bg: '#16a34a18' },
  ya_fui:     { label: 'YA FUI',     color: '#f59e0b', bg: '#f59e0b18' },
  descartado: { label: 'DESCARTADO', color: '#aaa',    bg: '#f0f0f018' },
}

function formatRadius(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function makePin(type: string, selected: boolean): L.DivIcon {
  const color = TYPE_COLORS[type] ?? '#6b7280'
  const size = selected ? 16 : 10
  const inner = selected
    ? `background:${color};box-shadow:0 0 0 2px #000,0 0 8px ${color};`
    : `background:${color}55;border:2px solid ${color}99;`
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;${inner}cursor:pointer;transition:all 0.15s;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: 10, color: i <= Math.round(rating) ? '#f5e642' : '#ccc', textShadow: i <= Math.round(rating) ? '0 0 0 1px #000' : 'none' }}>
          ★
        </span>
      ))}
    </div>
  )
}

function MapController({ locked, onCircleDrawn }: { locked: boolean; onCircleDrawn: (c: DrawnCircle) => void }) {
  const map = useMap()
  const callbackRef = useRef(onCircleDrawn)
  callbackRef.current = onCircleDrawn

  useEffect(() => {
    const container = map.getContainer()
    if (locked) {
      map.dragging.disable()
      map.scrollWheelZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoom.disable()
      map.boxZoom.disable()
      map.keyboard.disable()
      container.style.cursor = 'crosshair'
    } else {
      map.dragging.enable()
      map.scrollWheelZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoom.enable()
      map.boxZoom.enable()
      map.keyboard.enable()
      container.style.cursor = ''
    }
  }, [locked, map])

  useEffect(() => {
    if (!locked) return
    const handler = new L.Draw.Circle(map, {
      shapeOptions: { color: '#000', weight: 2, dashArray: '6 4', fillOpacity: 0.05 },
    })
    handler.enable()

    const onCreated = (e: L.DrawEvents.Created) => {
      const circle = e.layer as L.Circle
      callbackRef.current({ center: circle.getLatLng(), radius: circle.getRadius() })
      handler.enable()
    }
    map.on(L.Draw.Event.CREATED, onCreated)

    return () => {
      handler.disable()
      map.off(L.Draw.Event.CREATED, onCreated)
    }
  }, [locked, map])

  return null
}

export function MapCardView() {
  const [locked, setLocked] = useState(false)
  const [circle, setCircle] = useState<DrawnCircle | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ALL_TYPES))
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'type' | 'status'>('name-asc')
  const [placesData, setPlacesData] = useState<PlacesData | null>(null)
  const [placesLoading, setPlacesLoading] = useState(false)
  const [jobsData, setJobsData] = useState<{ total: number; jobs: { title: string; company: string; location: string; link: string }[] } | null>(null)
  const [jobsLoading, setJobsLoading] = useState(false)
  const { statuses, setStatus } = useBusinessStatus()

  useEffect(() => {
    if (!circle) { setBusinesses([]); setError(null); return }
    setLoading(true)
    setError(null)
    fetchBusinesses({
      lat: circle.center.lat,
      lon: circle.center.lng,
      radius: Math.round(circle.radius),
      type: 'all',
    })
      .then((data) => { setBusinesses(data) })
      .catch((e: unknown) => { setBusinesses([]); setError(e instanceof Error ? e.message : 'Error de red') })
      .finally(() => setLoading(false))
  }, [circle])

  useEffect(() => {
    if (!selectedId) { setJobsData(null); return }
    const b = businesses.find((x) => x.id === selectedId)
    if (!b) return
    setJobsLoading(true)
    setJobsData(null)
    fetch(`/api/jobs?name=${encodeURIComponent(b.name)}`)
      .then((r) => r.json())
      .then((d) => setJobsData(d))
      .catch(() => setJobsData(null))
      .finally(() => setJobsLoading(false))
  }, [selectedId, businesses])

  useEffect(() => {
    if (!selectedId) { setPlacesData(null); return }
    const b = businesses.find((x) => x.id === selectedId)
    if (!b) return
    setPlacesLoading(true)
    setPlacesData(null)
    fetch(`/api/places?name=${encodeURIComponent(b.name)}&lat=${b.lat}&lon=${b.lon}`)
      .then((r) => r.json())
      .then((d: PlacesData) => setPlacesData(Object.keys(d).some((k) => d[k as keyof PlacesData] != null) ? d : null))
      .catch(() => setPlacesData(null))
      .finally(() => setPlacesLoading(false))
  }, [selectedId, businesses])

  const handleCircleDrawn = (c: DrawnCircle) => {
    setCircle(c)
    setSelectedId(null)
    setLocked(false)
  }

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      if (prev.size === ALL_TYPES.length) return new Set([t])
      const next = new Set(prev)
      if (next.has(t)) {
        next.delete(t)
        if (next.size === 0) return new Set(ALL_TYPES)
      } else {
        next.add(t)
      }
      return next
    })
  }

  const STATUS_ORDER: Record<string, number> = { interesado: 0, postule: 1, ya_fui: 2, descartado: 3 }

  const filtered = businesses
    .filter(
      (b) =>
        activeTypes.has(b.type) &&
        (search === '' || b.name.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':  return a.name.localeCompare(b.name)
        case 'name-desc': return b.name.localeCompare(a.name)
        case 'type':      return a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
        case 'status': {
          const sa = statuses[a.id] != null ? (STATUS_ORDER[statuses[a.id]] ?? 99) : 99
          const sb = statuses[b.id] != null ? (STATUS_ORDER[statuses[b.id]] ?? 99) : 99
          return sa - sb || a.name.localeCompare(b.name)
        }
        default: return 0
      }
    })

  const exportCSV = () => {
    const headers = ['Nombre', 'Tipo', 'Dirección', 'Estado']
    const rows = filtered.map((b) => [
      `"${b.name.replace(/"/g, '""')}"`,
      TYPE_LABELS[b.type] ?? b.type,
      `"${(b.address ?? '').replace(/"/g, '""')}"`,
      statuses[b.id] ? STATUS_CONFIG[statuses[b.id]].label : '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `empresas_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ height: '100vh', background: '#f0ebe3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2vh 2vw' }}>
      <div style={{ display: 'flex', gap: '1.5vw', alignItems: 'stretch', width: '94vw', maxWidth: '1500px', height: '88vh' }}>

        {/* ── MAP CARD ── */}
        <div style={{ flex: '1 1 0', minWidth: 0, border: '3px solid #000', boxShadow: '8px 8px 0 #000', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* header */}
          <div style={{ flexShrink: 0, padding: '0 1.2vw', minHeight: '44px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '11px', fontWeight: 900, letterSpacing: '3px', color: '#f5e642' }}>
              MAPA DE EMPRESAS
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {circle && (
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#888', letterSpacing: '1px' }}>
                  {formatRadius(circle.radius)}
                </span>
              )}
              {circle && (
                <button onClick={() => { setCircle(null); setSelectedId(null) }} style={btnStyle('#ff3f00')}>
                  LIMPIAR
                </button>
              )}
              <button onClick={() => setLocked((v) => !v)} style={btnStyle(locked ? '#f5e642' : '#555')}>
                {locked ? '✏️ DIBUJAR' : '🔓 LIBRE'}
              </button>
            </div>
          </div>

          {/* map */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {loading && (
              <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: '#000', color: '#f5e642', fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 900, letterSpacing: '2px', padding: '6px 14px' }}>
                BUSCANDO...
              </div>
            )}
            <LeafletMapContainer center={[-33.45, -70.65]} zoom={14} style={{ width: '100%', height: '100%' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                subdomains="abcd"
                maxZoom={19}
              />
              <MapController locked={locked} onCircleDrawn={handleCircleDrawn} />
              {circle && (
                <Circle
                  center={circle.center}
                  radius={circle.radius}
                  pathOptions={{ color: '#000', weight: 2, dashArray: '6 4', fillOpacity: 0.04 }}
                />
              )}
              {filtered.map((b) => (
                <Marker
                  key={b.id}
                  position={[b.lat, b.lon]}
                  icon={makePin(b.type, selectedId === b.id)}
                  eventHandlers={{ click: () => setSelectedId(b.id) }}
                />
              ))}
            </LeafletMapContainer>
          </div>
        </div>

        {/* ── SIDE PANEL CARD ── */}
        <div style={{
          width: 'clamp(260px, 26vw, 400px)',
          flexShrink: 0,
          border: '3px solid #000',
          boxShadow: '8px 8px 0 #000',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* panel header */}
          <div style={{ flexShrink: 0, padding: '0 14px', minHeight: '44px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 900, letterSpacing: '2px', color: '#f5e642' }}>
              LOCALES
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {businesses.length > 0 && (
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#888' }}>
                  {filtered.length}/{businesses.length}
                </span>
              )}
              {filtered.length > 0 && (
                <button
                  onClick={exportCSV}
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '8px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    border: '1px solid #f5e642',
                    background: 'transparent',
                    color: '#f5e642',
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                  }}
                >
                  CSV ↓
                </button>
              )}
            </div>
          </div>

          {/* search input */}
          <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '11px',
                fontWeight: 600,
                padding: '6px 10px',
                border: '2px solid #000',
                background: '#f0ebe3',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* sort controls */}
          <div style={{ padding: '8px 14px 0', display: 'flex', gap: '4px', flexShrink: 0, flexWrap: 'wrap' }}>
            {([['name-asc', 'A→Z'], ['name-desc', 'Z→A'], ['type', 'TIPO'], ['status', 'ESTADO']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: '8px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  border: `1.5px solid ${sortBy === key ? '#000' : '#ccc'}`,
                  background: sortBy === key ? '#000' : 'transparent',
                  color: sortBy === key ? '#f5e642' : '#aaa',
                  cursor: 'pointer',
                  letterSpacing: '0.5px',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* category filter chips */}
          <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '6px', flexShrink: 0, borderBottom: '2px solid #000' }}>
            {ALL_TYPES.map((t) => {
              const active = activeTypes.has(t)
              const color = TYPE_COLORS[t]
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    border: `2px solid ${active ? color : '#ccc'}`,
                    background: active ? color + '18' : 'transparent',
                    color: active ? color : '#aaa',
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? color : '#ccc', flexShrink: 0 }} />
                  {TYPE_LABELS[t]}
                </button>
              )
            })}
          </div>

          {/* business list */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {!circle && (
              <div style={{ padding: '20px 14px', fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
                Dibuja un área en el mapa
              </div>
            )}
            {circle && loading && (
              <div style={{ padding: '20px 14px', fontFamily: 'Unbounded, sans-serif', fontSize: '9px', color: '#000', letterSpacing: '2px', textAlign: 'center' }}>
                BUSCANDO...
              </div>
            )}
            {circle && error && !loading && (
              <div style={{ padding: '14px', fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px', color: '#ff3f00', fontWeight: 700 }}>
                {error}
              </div>
            )}
            {!loading && !error && filtered.map((b) => {
              const color = TYPE_COLORS[b.type] ?? '#6b7280'
              const isSelected = selectedId === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 14px',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderBottom: '1px solid #eee',
                    background: isSelected ? '#f5e642' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: isSelected ? 'inset 3px 0 0 #000' : 'none',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3, border: '1.5px solid #000' }} />
                  {statuses[b.id] && (() => {
                    const cfg = STATUS_CONFIG[statuses[b.id]]
                    return (
                      <span style={{
                        fontFamily: 'Space Grotesk, sans-serif',
                        fontSize: '8px',
                        fontWeight: 700,
                        padding: '1px 5px',
                        background: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}`,
                        flexShrink: 0,
                        alignSelf: 'flex-start',
                        marginTop: 1,
                      }}>
                        {cfg.label}
                      </span>
                    )
                  })()}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px', fontWeight: 700, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name}
                    </div>
                    {b.address && (
                      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {b.address}
                      </div>
                    )}
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px', color: color, fontWeight: 700, letterSpacing: '0.5px', marginTop: 2 }}>
                      {TYPE_LABELS[b.type] ?? b.type}
                    </div>
                    {isSelected && jobsLoading && (
                      <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', color: '#aaa', letterSpacing: '1px', marginTop: 8 }}>
                        BUSCANDO VACANTES...
                      </div>
                    )}
                    {isSelected && !jobsLoading && jobsData && (
                      <div style={{ marginTop: 8 }}>
                        {jobsData.total === 0 ? (
                          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#aaa', fontWeight: 600 }}>
                            Sin vacantes activas
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 900, color: '#16a34a', letterSpacing: '1px', marginBottom: 6 }}>
                              {jobsData.total} VACANTE{jobsData.total !== 1 ? 'S' : ''} ENCONTRADA{jobsData.total !== 1 ? 'S' : ''}
                            </div>
                            {jobsData.jobs.map((j, i) => (
                              <a
                                key={i}
                                href={j.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: 'block',
                                  fontFamily: 'Space Grotesk, sans-serif',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#000',
                                  textDecoration: 'none',
                                  padding: '4px 0',
                                  borderBottom: i < jobsData.jobs.length - 1 ? '1px solid #ddd' : 'none',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                → {j.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {isSelected && placesLoading && (
                      <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', color: '#aaa', letterSpacing: '1px', marginTop: 6 }}>
                        CARGANDO...
                      </div>
                    )}
                    {isSelected && placesData && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {placesData.photo_reference && (
                          <img
                            src={`/api/places/photo?ref=${placesData.photo_reference}`}
                            alt="fachada"
                            style={{
                              width: '100%',
                              height: '100px',
                              objectFit: 'cover',
                              border: '2px solid #000',
                              display: 'block',
                            }}
                          />
                        )}
                        {placesData.rating != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Stars rating={placesData.rating} />
                            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#555' }}>
                              {placesData.rating.toFixed(1)} {placesData.ratings_total != null && `(${placesData.ratings_total})`}
                            </span>
                          </div>
                        )}
                        {placesData.phone && (
                          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#555' }}>
                            📞 {placesData.phone}
                          </div>
                        )}
                        {placesData.website && (
                          <a
                            href={placesData.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#000', fontWeight: 700, textDecoration: 'underline', wordBreak: 'break-all' }}
                          >
                            {placesData.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                          </a>
                        )}
                        {placesData.hours && placesData.hours.length > 0 && (
                          <div style={{ marginTop: 2 }}>
                            {placesData.hours.map((h, i) => (
                              <div key={i} style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px', color: '#777', lineHeight: 1.5 }}>
                                {h}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {isSelected && (
                      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(Object.entries(STATUS_CONFIG) as [BusinessStatus, typeof STATUS_CONFIG[BusinessStatus]][]).map(([key, cfg]) => {
                          const active = statuses[b.id] === key
                          return (
                            <button
                              key={key}
                              onClick={(e) => { e.stopPropagation(); setStatus(b.id, active ? null : key) }}
                              style={{
                                fontFamily: 'Space Grotesk, sans-serif',
                                fontSize: '8px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                border: `2px solid ${cfg.color}`,
                                background: active ? cfg.color : 'transparent',
                                color: active ? '#fff' : cfg.color,
                                cursor: 'pointer',
                                letterSpacing: '0.5px',
                              }}
                            >
                              {cfg.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
            {!loading && !error && circle && businesses.length > 0 && filtered.length === 0 && (
              <div style={{ padding: '20px 14px', fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
                Sin resultados con estos filtros
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function btnStyle(color: string): React.CSSProperties {
  return {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: '10px',
    fontWeight: 700,
    padding: '4px 12px',
    border: `2px solid ${color}`,
    background: 'transparent',
    color,
    cursor: 'pointer',
    letterSpacing: '1px',
  }
}
