import os
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

PLACES_BASE = "https://maps.googleapis.com/maps/api/place"

_cache: dict[str, Optional[dict]] = {}


async def get_place_details(name: str, lat: float, lon: float) -> Optional[dict]:
    cache_key = f"{name}:{lat:.4f}:{lon:.4f}"
    if cache_key in _cache:
        return _cache[cache_key]

    api_key = os.getenv("GOOGLE_PLACES_KEY")
    if not api_key:
        return None

    async with httpx.AsyncClient(timeout=10.0) as client:
        r1 = await client.get(f"{PLACES_BASE}/findplacefromtext/json", params={
            "input": name,
            "inputtype": "textquery",
            "locationbias": f"circle:200@{lat},{lon}",
            "fields": "place_id",
            "key": api_key,
        })
        candidates = r1.json().get("candidates", [])
        if not candidates:
            _cache[cache_key] = None
            return None

        place_id = candidates[0]["place_id"]

        r2 = await client.get(f"{PLACES_BASE}/details/json", params={
            "place_id": place_id,
            "fields": "name,rating,user_ratings_total,formatted_phone_number,website,opening_hours,photos",
            "key": api_key,
        })
        raw = r2.json().get("result", {})

    photos = raw.get("photos", [])
    result = {
        "rating": raw.get("rating"),
        "ratings_total": raw.get("user_ratings_total"),
        "phone": raw.get("formatted_phone_number"),
        "website": raw.get("website"),
        "hours": raw.get("opening_hours", {}).get("weekday_text"),
        "photo_reference": photos[0]["photo_reference"] if photos else None,
    }
    _cache[cache_key] = result
    return result
