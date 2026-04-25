import httpx
from typing import Optional

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

_TYPE_FILTERS: dict[str, list[str]] = {
    "restaurant": [
        'node["amenity"="restaurant"]',
        'way["amenity"="restaurant"]',
    ],
    "cafe": [
        'node["amenity"="cafe"]',
        'way["amenity"="cafe"]',
    ],
    "bank": [
        'node["amenity"="bank"]',
        'way["amenity"="bank"]',
    ],
    "hotel": [
        'node["tourism"="hotel"]',
        'way["tourism"="hotel"]',
    ],
    "shop": [
        'node["shop"]',
        'way["shop"]',
    ],
    "office": [
        'node["office"]',
        'way["office"]',
    ],
}

_ALL_FILTERS = [f for filters in _TYPE_FILTERS.values() for f in filters]

_AMENITY_TO_TYPE = {
    "restaurant": "restaurant",
    "cafe": "cafe",
    "bank": "bank",
}


def _build_query(lat: float, lon: float, radius: int, business_type: str) -> str:
    around = f"(around:{radius},{lat},{lon})"
    filters = _ALL_FILTERS if business_type == "all" else _TYPE_FILTERS.get(business_type, _ALL_FILTERS)
    lines = "\n".join(f"  {f}{around};" for f in filters)
    return f"[out:json][timeout:15];\n(\n{lines}\n);\nout center body;"


def _parse_element(el: dict) -> Optional[dict]:
    tags = el.get("tags", {})
    name = tags.get("name")
    if not name:
        return None

    lat = el.get("lat") or el.get("center", {}).get("lat")
    lon = el.get("lon") or el.get("center", {}).get("lon")
    if lat is None or lon is None:
        return None

    amenity = tags.get("amenity", "")
    business_type: str = _AMENITY_TO_TYPE.get(amenity, "")

    if not business_type:
        if tags.get("tourism") == "hotel":
            business_type = "hotel"
        elif tags.get("shop"):
            business_type = "shop"
        elif tags.get("office"):
            business_type = "office"
        else:
            business_type = "other"

    street = tags.get("addr:street", "")
    number = tags.get("addr:housenumber", "")
    address = f"{street} {number}".strip() or None

    return {
        "id": f"{el['type']}/{el['id']}",
        "name": name,
        "type": business_type,
        "lat": lat,
        "lon": lon,
        "address": address,
    }


async def search_businesses(lat: float, lon: float, radius: int, business_type: str) -> list[dict]:
    query = _build_query(lat, lon, radius, business_type)
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(OVERPASS_URL, data={"data": query})
        response.raise_for_status()
        data = response.json()

    results = []
    for el in data.get("elements", []):
        parsed = _parse_element(el)
        if parsed:
            results.append(parsed)
    return results
