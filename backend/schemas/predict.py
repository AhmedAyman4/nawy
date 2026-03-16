from pydantic import BaseModel

class PricePredictionRequest(BaseModel):
    location: str
    property_type: str
    m2: float
    Beds: float
    Baths: float

class PricePredictionResponse(BaseModel):
    location: str
    property_type: str
    m2: float
    Beds: float
    Baths: float
    predicted_price_egp: float
    predicted_price_formatted: str
