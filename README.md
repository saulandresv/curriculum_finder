# Curriculum Finder

Explora negocios y lugares de interés dibujando un área en el mapa.

## Cómo funciona

Dibuja un círculo sobre cualquier punto del mapa. La app consulta OpenStreetMap vía Overpass API y muestra todos los negocios dentro del área: restaurantes, cafés, bancos, hoteles, tiendas, supermercados, ferreterías, panaderías y oficinas. Filtra por tipo desde la barra superior.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Mapa | Leaflet + react-leaflet + leaflet-draw |
| Estado | Zustand |
| Data fetching | TanStack Query v5 |
| Backend | FastAPI (Python) |
| Datos geográficos | OpenStreetMap vía Overpass API |
| Deploy backend | Railway |

## Estructura

```
curriculum_finder/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Map/        # Mapa, pines por tipo, selector circular
│       │   └── Overlay/    # FilterBar, ResultsBar
│       ├── hooks/          # useBusinessSearch, useBusinessStatus, useMapCircle
│       ├── services/       # Cliente HTTP de la API
│       ├── store/          # mapStore (Zustand)
│       └── types/
└── backend/
    └── app/
        ├── routers/        # /search, /places, /jobs
        └── services/       # Overpass, Places, Jobs
```

## Instalación

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Crea `frontend/.env`:
```
VITE_API_URL=http://localhost:8000
```

## Tests

```bash
# Frontend (vitest + testing-library)
cd frontend && npx vitest

# Backend
cd backend && pytest
```