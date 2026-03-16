from pydantic import BaseModel

class CompareRequest(BaseModel):
    id1: str
    id2: str
