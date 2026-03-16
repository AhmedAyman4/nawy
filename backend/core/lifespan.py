import os
import joblib
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Loads all heavy assets (DataFrames, Embeddings models, Vector DBs, LLMs)
    only once when the server starts up.
    """
    print("Loading properties DataFrame...")
    # Ensure nawy_properties_cleaned.csv is in the same directory
    app.state.df = pd.read_csv("nawy_properties_cleaned.csv", dtype={"id": str})

    print("Initializing Embeddings model...")
    embeddings = HuggingFaceEmbeddings(
        model_name="Qwen/Qwen3-Embedding-0.6B",
        model_kwargs={"trust_remote_code": True}
    )

    print("Loading ChromaDB Vectorstore...")
    # Ensure the property_recommender_db directory is present
    app.state.vectorstore = Chroma(
        persist_directory="./property_recommender_db",
        embedding_function=embeddings
    )

    print("Loading Location Information VectorDB...")
    app.state.location_vectorstore = Chroma(
        persist_directory="./location_information_db",
        embedding_function=embeddings
    )
    print("Location VectorDB loaded!")

    print("Initializing Groq LLM...")
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        print("WARNING: GROQ_API_KEY is missing! Set it in your environment variables.")
        
    app.state.llm = ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=groq_api_key,
        temperature=0,
        max_tokens=1000
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
    
    print("🚀 API is ready!")
    yield
    print("Shutting down API...")
