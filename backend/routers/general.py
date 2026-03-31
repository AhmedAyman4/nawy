from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "Property Recommender API running"}

@router.get("/ping")
async def ping_pong():
    return {"ping": "pong"}
