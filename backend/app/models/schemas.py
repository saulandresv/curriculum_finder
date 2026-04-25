from pydantic import BaseModel
from typing import Literal, Optional

BusinessType = Literal[
    "office", "restaurant", "cafe", "shop", "bank", "hotel", "other"
]


class Business(BaseModel):
    id: str
    name: str
    type: BusinessType
    lat: float
    lon: float
    address: Optional[str] = None
