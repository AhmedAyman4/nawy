import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.lifespan import lifespan
from .routers import properties, chat, compare, predict

app = FastAPI(
    title="Property Recommender System API",
    description="Semantic real estate recommendation engine using ChromaDB and Groq LLM.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(properties.router, tags=["Properties"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(compare.router, prefix="/compare", tags=["Comparison"])
app.include_router(predict.router, prefix="/predict-price", tags=["Prediction"])

@app.get("/", tags=["Root"])
async def root():
    return {"message": "Property Recommender API running"}

@app.get("/ping", tags=["Root"])
async def ping_pong():
    return {"ping": "pong"}
