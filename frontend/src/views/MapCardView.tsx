// frontend/src/views/MapCardView.tsx
import { useState, useEffect, useRef } from 'react'
import './MapCardView.css'
import { MapContainer as LeafletMapContainer, TileLayer, useMap, Circle, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import '../components/Map/leafletIconFix'
import { fetchBusinesses } from '../services/api'
import type { Business } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
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
    const drawMap = map as unknown as L.DrawMap
    const handler = new L.Draw.Circle(drawMap, {
      shapeOptions: { color: '#000', weight: 2, dashArray: '6 4', fillOpacity: 0.05 },
    })
    handler.enable()

    const onCreated = (e: L.DrawEvents.Created) => {
      map.removeLayer(e.layer)
      const circle = e.layer as L.Circle
      callbackRef.current({ center: circle.getLatLng(), radius: circle.getRadius() })
      handler.enable()
    }
    drawMap.on(L.Draw.Event.CREATED, onCreated as L.LeafletEventHandlerFn)

    return () => {
      handler.disable()
      drawMap.off(L.Draw.Event.CREATED, onCreated as L.LeafletEventHandlerFn)
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
  const [sortField, setSortField] = useState<'name' | 'type' | 'status' | 'vacancies'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [onlyWithVacancies, setOnlyWithVacancies] = useState(false)
  const [vacancyCache, setVacancyCache] = useState<Record<string, number>>({})
  const [vacancyCacheLoading, setVacancyCacheLoading] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [filterOpen, setFilterOpen] = useState(() => window.innerWidth > 640)
  const [routeSet, setRouteSet] = useState<Set<string>>(new Set())
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
      .then((data) => { setBusinesses(data); setVacancyCache({}); setOnlyWithVacancies(false) })
      .catch((e: unknown) => { setBusinesses([]); setError(e instanceof Error ? e.message : 'Error de red') })
      .finally(() => setLoading(false))
  }, [circle])

  useEffect(() => {
    if (!selectedId) { setJobsData(null); return }
    const b = businesses.find((x) => x.id === selectedId)
    if (!b) return
    setJobsLoading(true)
    setJobsData(null)
    fetch(`${API_BASE}/api/jobs?name=${encodeURIComponent(b.name)}`)
      .then((r) => r.json())
      .then((d) => {
        setJobsData(d)
        setVacancyCache((prev) => ({ ...prev, [b.id]: d.total ?? 0 }))
      })
      .catch(() => setJobsData(null))
      .finally(() => setJobsLoading(false))
  }, [selectedId, businesses])

  useEffect(() => {
    if (!selectedId) { setPlacesData(null); return }
    const b = businesses.find((x) => x.id === selectedId)
    if (!b) return
    setPlacesLoading(true)
    setPlacesData(null)
    fetch(`${API_BASE}/api/places?name=${encodeURIComponent(b.name)}&lat=${b.lat}&lon=${b.lon}`)
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

  const handleVacanciesToggle = () => {
    if (onlyWithVacancies) { setOnlyWithVacancies(false); return }
    const uncached = businesses.filter((b) => !(b.id in vacancyCache))
    if (uncached.length === 0) { setOnlyWithVacancies(true); return }
    setVacancyCacheLoading(true)
    Promise.all(
      uncached.map((b) =>
        fetch(`${API_BASE}/api/jobs?name=${encodeURIComponent(b.name)}`)
          .then((r) => r.json())
          .then((d) => [b.id, d.total ?? 0] as const)
          .catch(() => [b.id, 0] as const)
      )
    ).then((results) => {
      setVacancyCache((prev) => ({ ...prev, ...Object.fromEntries(results) }))
      setOnlyWithVacancies(true)
    }).finally(() => setVacancyCacheLoading(false))
  }

  const toggleRoute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRouteSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const ptDist = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
    const d = (a.lat - b.lat) ** 2 + (a.lon - b.lon) ** 2
    return Math.sqrt(d)
  }

  const handleOpenRoute = () => {
    if (routeSet.size === 0) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const points = [...routeSet]
          .map((id) => businesses.find((b) => b.id === id))
          .filter((b): b is Business => b != null)
        let current = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        const remaining = [...points]
        const ordered: typeof points = []
        while (remaining.length > 0) {
          let nearestIdx = 0
          let nearestDist = ptDist(current, remaining[0])
          for (let i = 1; i < remaining.length; i++) {
            const d = ptDist(current, remaining[i])
            if (d < nearestDist) { nearestDist = d; nearestIdx = i }
          }
          const [next] = remaining.splice(nearestIdx, 1)
          ordered.push(next)
          current = { lat: next.lat, lon: next.lon }
        }
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`
        const dest = ordered[ordered.length - 1]
        const mid = ordered.slice(0, -1)
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest.lat},${dest.lon}&travelmode=walking`
        if (mid.length > 0) url += `&waypoints=${mid.map((p) => `${p.lat},${p.lon}`).join('|')}`
        window.open(url, '_blank')
      },
      () => alert('No se pudo obtener tu ubicación. Activa el permiso de geolocalización.')
    )
  }

  const filtered = businesses
    .filter(
      (b) =>
        activeTypes.has(b.type) &&
        (search === '' || b.name.toLowerCase().includes(search.toLowerCase())) &&
        (!onlyWithVacancies || (vacancyCache[b.id] ?? 0) > 0)
    )
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortField) {
        case 'name':    return dir * a.name.localeCompare(b.name)
        case 'type':    return dir * (a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
        case 'status': {
          const sa = statuses[a.id] != null ? (STATUS_ORDER[statuses[a.id]] ?? 99) : 99
          const sb = statuses[b.id] != null ? (STATUS_ORDER[statuses[b.id]] ?? 99) : 99
          return dir * ((sa - sb) || a.name.localeCompare(b.name))
        }
        case 'vacancies': {
          const va = vacancyCache[a.id] ?? -1
          const vb = vacancyCache[b.id] ?? -1
          return dir * ((vb - va) || a.name.localeCompare(b.name))
        }
        default: return 0
      }
    })

  const allFilteredSelected = filtered.length > 0 && filtered.every((b) => routeSet.has(b.id))

  const toggleAllFiltered = () => {
    setRouteSet((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) filtered.forEach((b) => next.delete(b.id))
      else filtered.forEach((b) => next.add(b.id))
      return next
    })
  }

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
    <div className="mcv-root">
      <div className="mcv-layout">

        {/* ── MAP CARD ── */}
        <div className="mcv-map-card">

          {/* header */}
          <div style={{ flexShrink: 0, padding: '0 1.2vw', minHeight: '44px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '11px', fontWeight: 900, letterSpacing: '3px', color: '#f5e642' }}>
                MAPA DE EMPRESAS
              </span>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '8px', color: '#666', letterSpacing: '1px', marginTop: 1 }}>
                Explora · Filtra · Postula
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {circle && (
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#888', letterSpacing: '1px' }}>
                  {formatRadius(circle.radius)}
                </span>
              )}
              {circle && (
                <button onClick={() => { setCircle(null); setSelectedId(null); setBusinesses([]) }} style={btnStyle('#ff3f00')}>
                  LIMPIAR
                </button>
              )}
              {(!showOverlay || circle) && (
                <button onClick={() => setLocked((v) => !v)} style={btnStyle(locked ? '#f5e642' : '#fff')}>
                  {locked ? '✕ CANCELAR' : '✏ DIBUJAR ZONA'}
                </button>
              )}
            </div>
          </div>

          {/* map */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
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

            {/* overlay: instrucciones para nuevos usuarios */}
            {showOverlay && !circle && !locked && (
              <div className="mcv-overlay" style={{ position: 'absolute', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.84)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
                <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', letterSpacing: '4px', color: '#f5e642', fontWeight: 900 }}>
                  CÓMO USAR
                </div>
                <div className="mcv-steps-row">
                  {([
                    { n: '01', title: 'NAVEGA EL MAPA', desc: 'Desplázate para encontrar la zona que quieres explorar' },
                    { n: '02', title: 'ACTIVA EL DIBUJO', desc: 'Click en "✏ DIBUJAR ZONA" y arrastra para delimitar el área' },
                    { n: '03', title: 'EXPLORA Y POSTULA', desc: 'Filtra empresas, revisa vacantes y planifica tu ruta' },
                  ] as const).map((s) => (
                    <div key={s.n} className="mcv-step-card">
                      <div className="mcv-step-n" style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '24px', fontWeight: 900, color: '#f5e642', lineHeight: 1 }}>{s.n}</div>
                      <div className="mcv-step-title" style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '7px', letterSpacing: '1px', color: '#fff', fontWeight: 700, lineHeight: 1.5 }}>{s.title}</div>
                      <div className="mcv-step-desc" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px', color: '#888', lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
                <div className="mcv-overlay-btns" style={{ display: 'flex', gap: 12 }}>
                  <button
                    className="mcv-overlay-btn"
                    onClick={() => setShowOverlay(false)}
                    style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 900, letterSpacing: '1px', padding: '10px 20px', background: 'transparent', color: '#fff', border: '2px solid #555', cursor: 'pointer' }}
                  >
                    🗺 EXPLORAR MAPA
                  </button>
                  <button
                    className="mcv-overlay-btn"
                    onClick={() => { setShowOverlay(false); setLocked(true) }}
                    style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 900, letterSpacing: '1px', padding: '10px 20px', background: '#f5e642', color: '#000', border: '3px solid #000', cursor: 'pointer', boxShadow: '4px 4px 0 rgba(255,255,255,0.15)' }}
                  >
                    ✏ DIBUJAR ZONA →
                  </button>
                </div>
              </div>
            )}

            {/* banner modo dibujo */}
            {locked && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1001, background: '#f5e642', padding: '7px 16px', display: 'flex', alignItems: 'center', borderTop: '2px solid #000' }}>
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 900, letterSpacing: '2px', color: '#000', flex: 1, textAlign: 'center' }}>
                  ✏ MODO DIBUJO ACTIVO — CLICK Y ARRASTRA PARA DEFINIR EL ÁREA
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── SIDE PANEL CARD ── */}
        <div className="mcv-panel-card">

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
              {filtered.length > 0 && (
                <button
                  onClick={toggleAllFiltered}
                  title={allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  style={{
                    width: 18,
                    height: 18,
                    border: `2px solid ${allFilteredSelected ? '#f5e642' : '#555'}`,
                    background: allFilteredSelected ? '#f5e642' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  {allFilteredSelected && <span style={{ fontSize: 10, fontWeight: 900, color: '#000', lineHeight: 1 }}>✓</span>}
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

          {/* sort + vacancy filter */}
          <div style={{ padding: '8px 14px 0', display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as typeof sortField)}
              style={{
                flex: 1,
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '9px',
                fontWeight: 700,
                padding: '4px 6px',
                border: '2px solid #000',
                background: '#fff',
                outline: 'none',
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              <option value="name">NOMBRE</option>
              <option value="type">TIPO</option>
              <option value="status">ESTADO</option>
              <option value="vacancies">VACANTES</option>
            </select>
            <button
              onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '13px',
                fontWeight: 900,
                padding: '2px 9px',
                border: '2px solid #000',
                background: '#000',
                color: '#f5e642',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button
              onClick={handleVacanciesToggle}
              disabled={vacancyCacheLoading}
              style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: '8px',
                fontWeight: 700,
                padding: '4px 8px',
                border: `2px solid ${onlyWithVacancies ? '#16a34a' : '#ccc'}`,
                background: onlyWithVacancies ? '#16a34a18' : 'transparent',
                color: onlyWithVacancies ? '#16a34a' : '#888',
                cursor: vacancyCacheLoading ? 'wait' : 'pointer',
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
              }}
            >
              {vacancyCacheLoading ? '...' : '● VACANTES'}
            </button>
          </div>

          {/* route toolbar */}
          {routeSet.size > 0 && (
            <div style={{ flexShrink: 0, padding: '6px 14px', background: '#f5e642', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid #000' }}>
              <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px', fontWeight: 700, flex: 1 }}>
                {routeSet.size} PARADA{routeSet.size !== 1 ? 'S' : ''}
              </span>
              <button
                onClick={() => setRouteSet(new Set())}
                style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px', fontWeight: 700, padding: '2px 8px', border: '2px solid #000', background: 'transparent', cursor: 'pointer' }}
              >
                LIMPIAR
              </button>
              <button
                onClick={handleOpenRoute}
                style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '9px', fontWeight: 900, padding: '3px 10px', border: '2px solid #000', background: '#000', color: '#f5e642', cursor: 'pointer', letterSpacing: '1px' }}
              >
                RUTA ↗
              </button>
            </div>
          )}

          {/* category filter chips — collapsible */}
          <div style={{ flexShrink: 0, borderBottom: '2px solid #000' }}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              style={{ width: '100%', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '8px', fontWeight: 900, letterSpacing: '2px', color: '#000' }}>FILTROS</span>
              <span style={{ fontSize: '10px', color: '#000', display: 'inline-block', transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {filterOpen && (
              <div style={{ padding: '4px 14px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
            )}
          </div>

          {/* business list */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {!circle && (
              <div style={{ padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, border: '3px solid #000', borderRadius: '50%', background: '#f5e642', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
                  ⊕
                </div>
                <div style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '9px', fontWeight: 900, letterSpacing: '2px', textAlign: 'center', lineHeight: 2, color: '#000' }}>
                  DEFINE UN ÁREA<br />DE BÚSQUEDA
                </div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', color: '#888', textAlign: 'center', lineHeight: 1.7 }}>
                  Activa el modo dibujo en el<br />mapa y arrastra para explorar<br />empresas en esa zona.
                </div>
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
                  <button
                    onClick={(e) => toggleRoute(b.id, e)}
                    style={{
                      width: 14,
                      height: 14,
                      border: `2px solid ${routeSet.has(b.id) ? '#000' : '#ccc'}`,
                      background: routeSet.has(b.id) ? '#000' : 'transparent',
                      flexShrink: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      marginTop: 1,
                    }}
                  >
                    {routeSet.has(b.id) && <span style={{ color: '#f5e642', fontSize: 8, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </button>
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
                            src={`${API_BASE}/api/places/photo?ref=${placesData.photo_reference}`}
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
