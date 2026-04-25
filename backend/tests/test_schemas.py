from app.models.schemas import Business
import pytest
from pydantic import ValidationError


def test_business_schema_valid():
    b = Business(
        id="node/123",
        name="TechCorp",
        type="office",
        lat=-33.45,
        lon=-70.65,
    )
    assert b.id == "node/123"
    assert b.address is None


def test_business_schema_with_address():
    b = Business(
        id="node/456",
        name="Café Central",
        type="cafe",
        lat=-33.46,
        lon=-70.66,
        address="Av. Providencia 123",
    )
    assert b.address == "Av. Providencia 123"


def test_business_schema_invalid_type():
    with pytest.raises(ValidationError):
        Business(id="x", name="X", type="spaceship", lat=0.0, lon=0.0)
