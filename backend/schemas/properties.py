from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 150
    page: Optional[int] = 1
    size: Optional[int] = 20

class FilterRequest(BaseModel):
    location: Optional[str] = None
    property_type: Optional[str] = None
    Beds: Optional[float] = None
    Baths: Optional[float] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    top_k: Optional[int] = 150
    page: Optional[int] = 1
    size: Optional[int] = 20

class PropertyResponse(BaseModel):
    id: Any
    location: Optional[Any] = None
    property_name: Optional[Any] = None
    description: Optional[Any] = None
    m2: Optional[Any] = None
    Beds: Optional[Any] = None
    Baths: Optional[Any] = None
    payment_plan: Optional[Any] = None
    price: Optional[Any] = None
    tag: Optional[Any] = None
    url_path: Optional[Any] = None
    cover_image: Optional[Any] = None
    developer_logo: Optional[Any] = None
    price_float: Optional[Any] = None
    property_type: Optional[Any] = None

class PaginatedPropertyResponse(BaseModel):
    data: List[PropertyResponse]
    total: int
    page: int
    size: int
    total_pages: int
