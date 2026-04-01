import os
import joblib
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pymongo import MongoClient
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from .config import MONGO_URI

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading properties DataFrame...")
    app.state.df = pd.read_csv("nawy_properties_cleaned.csv", dtype={"id": str})

    print("Initializing Embeddings model...")
    embeddings = HuggingFaceEmbeddings(
        model_name="Qwen/Qwen3-Embedding-0.6B",
        model_kwargs={"trust_remote_code": True}
    )

    print("Loading ChromaDB Vectorstore...")
    app.state.vectorstore = Chroma(
        persist_directory="./property_recommender_db",
        embedding_function=embeddings
    )

    print("Loading Locations and Compounds VectorDB...")
    app.state.locations_and_compounds_vectorstore = Chroma(
        persist_directory="./locations_and_compounds_db",
        embedding_function=embeddings
    )
    print("Locations and Compounds VectorDB loaded!")

    print("Initializing Groq LLM...")
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        print("WARNING: GROQ_API_KEY is missing! Set it in your environment variables.")

    app.state.llm = ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=groq_api_key,
        temperature=0,
        max_tokens=3000
    )

    app.state.smart_llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=groq_api_key,
        temperature=0,
        max_tokens=2000
    )

    print("Loading Price Prediction Models...")
    try:
        app.state.price_model = joblib.load("./price_model/best_xgb_model.joblib")
        app.state.price_encoder = joblib.load("./price_model/location_encoder.joblib")
        print("Price Prediction Models loaded successfully!")
    except Exception as e:
        print(f"WARNING: Failed to load price prediction models: {e}")
        app.state.price_model = None
        app.state.price_encoder = None

    # Initialize local fallback stores (always created, used when Mongo is unavailable)
    app.state.local_chat_histories: dict[str, Any] = {}
    app.state.local_preferences: dict[str, dict] = {}

    print("Initializing shared MongoDB client...")
    try:
        app.state.mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        # Force a connection check
        app.state.mongo_client.admin.command("ping")
        app.state.mongo_available = True
        print("MongoDB client ready!")
    except Exception as e:
        print(f"WARNING: MongoDB unavailable at startup ({e}). Using local in-memory fallback.")
        app.state.mongo_client = None
        app.state.mongo_available = False

    print("🚀 API is ready!")
    yield
    print("Shutting down API...")
    if app.state.mongo_client:
        app.state.mongo_client.close()

