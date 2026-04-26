# backend/app/routers/search.py
import httpx
from fastapi import APIRouter, HTTPException, Query
from app.services.overpass import search_businesses
from app.models.schemas import Business

router = APIRouter()


@router.get("/search", response_model=list[Business])
async def search(
    lat: float = Query(..., description="Latitud centro del círculo"),
    lon: float = Query(..., description="Longitud centro del círculo"),
    radius: int = Query(default=500, ge=100, le=50000, description="Radio en metros"),
    type: str = Query(default="all", description="Tipo de empresa"),
):
    try:
        results = await search_businesses(lat=lat, lon=lon, radius=radius, business_type=type)
        return results
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Overpass API no disponible")
