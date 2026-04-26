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

_SHOP_TO_TYPE = {
    "supermarket": "supermercado",
    "convenience": "supermercado",
    "hardware": "ferreteria",
    "doityourself": "ferreteria",
    "bakery": "panaderia",
    "pastry": "panaderia",
    "clothes": "ropa",
    "shoes": "ropa",
    "fashion": "ropa",
}


def _build_query(lat: float, lon: float, radius: int, business_type: str) -> str:
    around = f"(around:{radius},{lat},{lon})"
    if business_type == "all":
        filters = _ALL_FILTERS
    elif business_type in _TYPE_FILTERS:
        filters = _TYPE_FILTERS[business_type]
    else:
        raise ValueError(f"Unknown business_type: {business_type!r}")
    lines = "\n".join(f"  {f}{around};" for f in filters)
    return f"[out:json][timeout:45];\n(\n{lines}\n);\nout center body;"


def _parse_element(el: dict) -> Optional[dict]:
    tags = el.get("tags", {})
    name = tags.get("name")
    if not name:
        return None

    lat = el["lat"] if "lat" in el else el.get("center", {}).get("lat")
    lon = el["lon"] if "lon" in el else el.get("center", {}).get("lon")
    if lat is None or lon is None:
        return None

    amenity = tags.get("amenity", "")
    business_type: str = _AMENITY_TO_TYPE.get(amenity, "")

    if not business_type:
        if tags.get("tourism") == "hotel":
            business_type = "hotel"
        elif tags.get("shop"):
            business_type = _SHOP_TO_TYPE.get(tags["shop"], "tienda")
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
    headers = {"User-Agent": "curriculum-rutes/1.0 (personal job search tool)"}
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(OVERPASS_URL, data={"data": query}, headers=headers)
        response.raise_for_status()
        data = response.json()

    results = []
    for el in data.get("elements", []):
        parsed = _parse_element(el)
        if parsed:
            results.append(parsed)
    return results
