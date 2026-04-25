import pytest
from app.services.overpass import _build_query, _parse_element

def test_build_query_specific_type():
    q = _build_query(lat=-33.45, lon=-70.65, radius=500, business_type="restaurant")
    assert 'around:500,-33.45,-70.65' in q
    assert '"amenity"="restaurant"' in q
    assert '[out:json][timeout:15]' in q
    assert 'out center body' in q

def test_build_query_all_includes_office_and_shop():
    q = _build_query(lat=-33.45, lon=-70.65, radius=1000, business_type="all")
    assert '"office"' in q
    assert '"shop"' in q
    assert '"amenity"="restaurant"' in q

def test_parse_element_node_restaurant():
    el = {
        "type": "node",
        "id": 111,
        "lat": -33.45,
        "lon": -70.65,
        "tags": {
            "name": "El Mercado",
            "amenity": "restaurant",
            "addr:street": "Av. Italia",
            "addr:housenumber": "42",
        },
    }
    result = _parse_element(el)
    assert result is not None
    assert result["id"] == "node/111"
    assert result["name"] == "El Mercado"
    assert result["type"] == "restaurant"
    assert result["address"] == "Av. Italia 42"

def test_parse_element_way_uses_center():
    el = {
        "type": "way",
        "id": 222,
        "center": {"lat": -33.46, "lon": -70.66},
        "tags": {"name": "Oficina X", "office": "company"},
    }
    result = _parse_element(el)
    assert result is not None
    assert result["lat"] == -33.46
    assert result["type"] == "office"

def test_parse_element_no_name_returns_none():
    el = {
        "type": "node", "id": 333,
        "lat": -33.45, "lon": -70.65,
        "tags": {"amenity": "restaurant"},
    }
    assert _parse_element(el) is None

def test_parse_element_shop():
    el = {
        "type": "node", "id": 444,
        "lat": -33.45, "lon": -70.65,
        "tags": {"name": "Tienda ABC", "shop": "clothes"},
    }
    result = _parse_element(el)
    assert result["type"] == "shop"
