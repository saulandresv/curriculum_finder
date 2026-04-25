# backend/tests/test_search.py
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

MOCK_BUSINESSES = [
    {
        "id": "node/1",
        "name": "TechCorp",
        "type": "office",
        "lat": -33.45,
        "lon": -70.65,
        "address": None,
    }
]

def test_search_returns_businesses():
    with patch(
        "app.routers.search.search_businesses",
        new=AsyncMock(return_value=MOCK_BUSINESSES),
    ):
        response = client.get("/api/search?lat=-33.45&lon=-70.65&radius=500&type=office")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "TechCorp"

def test_search_default_radius():
    with patch(
        "app.routers.search.search_businesses",
        new=AsyncMock(return_value=[]),
    ) as mock:
        client.get("/api/search?lat=-33.45&lon=-70.65")
        _, kwargs = mock.call_args
        assert kwargs["radius"] == 500

def test_search_overpass_unavailable_returns_503():
    import httpx
    with patch(
        "app.routers.search.search_businesses",
        new=AsyncMock(side_effect=httpx.HTTPError("timeout")),
    ):
        response = client.get("/api/search?lat=-33.45&lon=-70.65")
    assert response.status_code == 503
    assert "Overpass" in response.json()["detail"]

def test_search_missing_lat_returns_422():
    response = client.get("/api/search?lon=-70.65")
    assert response.status_code == 422
