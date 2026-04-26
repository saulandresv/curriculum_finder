import os
import httpx
from fastapi import APIRouter, Query
from fastapi.responses import Response as FastAPIResponse
from dotenv import load_dotenv
from app.services.places import get_place_details

load_dotenv()

router = APIRouter()


@router.get("/places")
async def places(
    name: str = Query(...),
    lat: float = Query(...),
    lon: float = Query(...),
):
    data = await get_place_details(name=name, lat=lat, lon=lon)
    return data or {}


@router.get("/places/photo")
async def photo(ref: str = Query(...)):
    api_key = os.getenv("GOOGLE_PLACES_KEY")
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        r = await client.get(
            "https://maps.googleapis.com/maps/api/place/photo",
            params={"maxwidth": 400, "photo_reference": ref, "key": api_key},
        )
    return FastAPIResponse(content=r.content, media_type=r.headers.get("content-type", "image/jpeg"))
