import os
import re
import math
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from langchain_core.runnables import RunnablePassthrough, RunnableParallel, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

# ==========================================
# 1. Define Pydantic Models for the API
# ==========================================
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

class ChatRequest(BaseModel):
    question: str

class CompareRequest(BaseModel):
    id1: str
    id2: str

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
    
# ==========================================
# 2. App Lifespan (Startup & Shutdown)
# ==========================================
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
        model="llama-3.1-8b-instant", # Using the exact model from your script
        api_key=groq_api_key,
        temperature=0,
        max_tokens=1000
    )

    print("🚀 API is ready!")
    yield
    print("Shutting down API...")

# ==========================================
# 3. Initialize FastAPI App
# ==========================================
app = FastAPI(
    title="Property Recommender System API",
    description="Semantic real estate recommendation engine using ChromaDB and Groq LLM.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for the Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_llm_code(raw_code: str) -> str:
    """Helper to remove markdown backticks if the LLM hallucinated them."""
    cleaned = re.sub(r"^```python\n", "", raw_code, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\n", "", cleaned)
    cleaned = re.sub(r"```$", "", cleaned)
    return cleaned.strip()

# ==========================================
# 4. API Endpoints
# ==========================================
@app.get("/")
async def root():
    return {"message": "Property Recommender API running"}

@app.get("/ping")
async def ping_pong():
    return {"ping": "pong"}

@app.get("/properties", response_model=PaginatedPropertyResponse)
async def get_random_properties(request: Request, page: int = 1, size: int = 20):
    try:
        df = request.app.state.df

        # Use a fixed random state to ensure pagination returns consistent results
        # while still showing a shuffled selection of properties.
        random_df = df.sample(frac=1, random_state=42)

        # Pagination Logic
        total_records = len(random_df)
        total_pages = math.ceil(total_records / size) if size > 0 else 1
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        
        df_paginated = random_df.iloc[start_idx:end_idx]

        cols_to_keep = [
            'id', 'location', 'property_name', 'description',
            'm2', 'Beds', 'Baths', 'payment_plan', 'price', 'tag',
            'url_path', 'cover_image', 'developer_logo', 'price_float', 'property_type'
        ]

        available_cols = [col for col in cols_to_keep if col in df_paginated.columns]

        # Convert to dictionary FIRST, then natively replace NaNs with None 
        records = df_paginated[available_cols].to_dict(orient="records")
        result_json = [{k: (None if pd.isna(v) else v) for k, v in row.items()} for row in records]

        return {
            "data": result_json,
            "total": total_records,
            "page": page,
            "size": size,
            "total_pages": total_pages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW ENDPOINTS FOR UI INTEGRATION ---

@app.get("/filter-options")
async def get_filter_options(request: Request):
    """
    Returns unique values from the dataset to populate UI dropdown menus.
    """
    df = request.app.state.df
    
    locations = df['location'].dropna().unique().tolist() if 'location' in df.columns else []
    # FIX: Use the property_type column correctly to populate the dropdowns
    property_types = df['property_type'].dropna().unique().tolist() if 'property_type' in df.columns else []
    
    return {
        "locations": sorted(locations),
        "property_types": sorted(property_types)
    }


@app.post("/filter", response_model=PaginatedPropertyResponse)
async def filter_properties(request: Request, payload: FilterRequest):
    """
    Applies hard filters based on the UI bar selections.
    """
    try:
        df = request.app.state.df.copy()

        # 1. Location Filter (Partial Match)
        if payload.location:
            df = df[df['location'].str.contains(payload.location, case=False, na=False)]
        
        # 2. Property Type Filter (FIX: Filters on property_type instead of tag)
        if payload.property_type:
            df = df[df['property_type'].str.contains(payload.property_type, case=False, na=False)]

        # 3. Beds & Baths Filters
        if payload.Beds is not None:
            if payload.Beds >= 5:
                df = df[df['Beds'] >= payload.Beds]
            else:
                df = df[df['Beds'] == payload.Beds]
        
        if payload.Baths is not None:
            if payload.Baths >= 5:
                df = df[df['Baths'] >= payload.Baths]
            else:
                df = df[df['Baths'] == payload.Baths]

        # 4. Price Filters
        if payload.min_price is not None:
            df = df[df['price_float'] >= payload.min_price]
            
        if payload.max_price is not None:
            df = df[df['price_float'] <= payload.max_price]

        # Pagination Logic
        total_records = len(df)
        total_pages = math.ceil(total_records / payload.size) if payload.size > 0 else 1
        start_idx = (payload.page - 1) * payload.size
        end_idx = start_idx + payload.size
        
        df_paginated = df.iloc[start_idx:end_idx]

        cols_to_keep = [
            'id', 'location', 'property_name', 'description',
            'm2', 'Beds', 'Baths', 'payment_plan', 'price', 'tag',
            'url_path', 'cover_image', 'developer_logo', 'price_float', 'property_type'
        ]
        
        available_cols = [col for col in cols_to_keep if col in df_paginated.columns]
        df_filtered = df_paginated[available_cols]

        # Convert to dictionary FIRST, then natively replace NaNs with None to avoid JSON 500 errors
        records = df_filtered.to_dict(orient='records')
        result_json = [{k: (None if pd.isna(v) else v) for k, v in row.items()} for row in records]
        
        return {
            "data": result_json,
            "total": total_records,
            "page": payload.page,
            "size": payload.size,
            "total_pages": total_pages
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----------------------------------------


@app.post("/recommend")
async def get_recommendations(request: Request, payload: QueryRequest):
    debug_info = {}
    try:
        query = payload.query
        top_k = payload.top_k
        page = payload.page
        size = payload.size

        df = request.app.state.df
        vectorstore = request.app.state.vectorstore
        llm = request.app.state.llm

        debug_info["query"] = query
        debug_info["dataframe_total_rows"] = len(df)

        if not query.strip():
            return {"data": [], "total": 0, "page": page, "size": size, "total_pages": 0, "debug": {"reason": "Empty query"}}

        # Step 1: Semantic Search
        recommendations = vectorstore.similarity_search(query, k=top_k)
        debug_info["vectorstore_hits"] = len(recommendations)

        # Step 2: ID extraction with float normalization
        recommendation_ids = []
        raw_ids_sample = []
        for doc in recommendations:
            raw_id = doc.metadata.get('id')
            if raw_id is not None:
                raw_ids_sample.append(raw_id)
                # DON'T convert to int — just cast directly to string to preserve leading zeros
                normalized_id = str(raw_id)
                recommendation_ids.append(normalized_id)

        debug_info["extracted_ids_count"] = len(recommendation_ids)
        debug_info["sample_raw_ids"] = raw_ids_sample[:5]
        debug_info["sample_normalized_ids"] = recommendation_ids[:5]
        debug_info["sample_df_ids"] = df['id'].head(5).tolist()

        if not recommendation_ids:
            return {"data": [], "total": 0, "page": page, "size": size, "total_pages": 0, "debug": {**debug_info, "reason": "No IDs extracted from vectorstore"}}

        recommended_df = df[df['id'].isin(recommendation_ids)].copy()
        debug_info["df_matches_after_id_join"] = len(recommended_df)

        if recommended_df.empty:
            return {"data": [], "total": 0, "page": page, "size": size, "total_pages": 0, "debug": {**debug_info, "reason": "ID join returned 0 rows — possible type mismatch between vectorstore and DataFrame IDs"}}

        # Step 3: LLM filter code generation
        columns_str = str(['m2', 'Beds', 'Baths', 'price_float'])
        prompt = ChatPromptTemplate.from_template("""
        You are a pandas code generator. Your ONLY job is to filter a DataFrame called `recommended_df` by NUMERIC conditions.
        
        Available numeric columns ONLY:
        {columns}
        - m2: area in square meters (e.g. 120)
        - Beds: number of bedrooms (e.g. 3)
        - Baths: number of bathrooms (e.g. 2)
        - price_float: price in full EGP — 1 million = 1000000, 10 million = 10000000
        
        User query: {query}
        
        Rules:
        - Extract ONLY numeric conditions from the query (price, beds, baths, area).
        - IGNORE any non-numeric filters like location, property type, or names — these are already handled elsewhere.
        - If the query has NO numeric conditions, return: df_filtered = recommended_df
        - Store result in df_filtered.
        - Output ONLY a single line of raw Python pandas code. No markdown, no backticks, no explanation.
        """)

        chain = prompt | llm
        raw_code = chain.invoke({"columns": columns_str, "query": query}).content.strip()
        code = clean_llm_code(raw_code)

        debug_info["llm_generated_code"] = code

        exec_locals = {"pd": pd, "recommended_df": recommended_df}

        try:
            exec(code, {}, exec_locals)
            df_filtered = exec_locals.get("df_filtered")

            if df_filtered is None:
                debug_info["llm_filter_result"] = "df_filtered was None — falling back"
                df_filtered = recommended_df
            elif len(df_filtered) == 0:
                debug_info["llm_filter_result"] = f"df_filtered was empty after applying code — falling back. price_float sample: {recommended_df['price_float'].dropna().head(5).tolist()}"
                df_filtered = recommended_df
            else:
                debug_info["llm_filter_result"] = f"OK — {len(df_filtered)} rows after filter"

        except Exception as exec_error:
            debug_info["llm_filter_result"] = f"exec() error: {str(exec_error)} — falling back"
            df_filtered = recommended_df

        # Pagination
        total_records = len(df_filtered)
        total_pages = math.ceil(total_records / size) if size > 0 else 1
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        df_paginated = df_filtered.iloc[start_idx:end_idx]

        cols_to_keep = [
            'id', 'location', 'property_name', 'description',
            'm2', 'Beds', 'Baths', 'payment_plan', 'price', 'tag',
            'url_path', 'cover_image', 'developer_logo', 'price_float', 'property_type'
        ]
        available_cols = [col for col in cols_to_keep if col in df_paginated.columns]
        records = df_paginated[available_cols].to_dict(orient='records')
        result_json = [{k: (None if pd.isna(v) else v) for k, v in row.items()} for row in records]

        return {
            "data": result_json,
            "total": total_records,
            "page": page,
            "size": size,
            "total_pages": total_pages,
            "debug": debug_info
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e), "debug": debug_info})



@app.post("/chat/location")
async def chat_about_location(request: Request, payload: ChatRequest):
    """
    RAG-based chat endpoint for answering questions about location information.
    Uses the location_information_db ChromaDB vectorstore.
    """
    try:
        llm = request.app.state.llm
        location_vectorstore = request.app.state.location_vectorstore

        if not payload.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        retriever = location_vectorstore.as_retriever(search_kwargs={"k": 10})

        location_prompt = ChatPromptTemplate.from_template("""
Answer the question based ONLY on the following context from location descriptions:
<context>{context}</context>

Question: {question}

Answer:""")

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        retrieved_docs = retriever.invoke(payload.question)
        context = format_docs(retrieved_docs)

        chain = location_prompt | llm

        response = chain.invoke({
            "context": context,
            "question": payload.question
        })

        return {
            "question": payload.question,
            "answer": response.content.strip()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/compare")
async def compare_properties(request: Request, payload: CompareRequest):
    """
    Compares two properties by ID using property details from the DataFrame
    and location context from the vectorstore.
    """
    try:
        df = request.app.state.df
        vectorstore = request.app.state.location_vectorstore
        llm = request.app.state.llm

        def get_properties_context(id1, id2, dataframe=df):
            """
            Takes two string IDs and returns property details as formatted text.
            """
            ids = [str(id1), str(id2)]
            selected_properties = dataframe[dataframe['id'].isin(ids)]

            context_parts = []
            for _, row in selected_properties.iterrows():
                prop_text = (
                    f"Location: {row['location']}\n"
                    f"Property Name: {row['property_name']}\n"
                    f"Description: {row['description']}\n"
                    f"Area: {row['m2']} m2\n"
                    f"Beds: {row['Beds']}\n"
                    f"Baths: {row['Baths']}\n"
                    f"Payment Plan: {row['payment_plan']}\n"
                    f"Price: {row['price']}"
                )
                context_parts.append(prop_text)

            return "\n\n---\n\n".join(context_parts)

        def property_retriever(inputs):
            """Retrieve property specs from dataframe"""
            id1 = inputs["id1"]
            id2 = inputs["id2"]
            return get_properties_context(id1, id2)

        def location_retriever(inputs):
            """Retrieve location information from vectorstore"""
            query = f"locations of properties {inputs['id1']} and {inputs['id2']}"
            return vectorstore.as_retriever(
                search_kwargs={"k": 5}
            ).invoke(query)

        def format_docs(docs):
            """Convert retrieved docs into text"""
            return "\n\n".join(doc.page_content for doc in docs)

        multi_context_prompt = ChatPromptTemplate.from_template(
            """
You are a real estate expert.

Compare the following two properties and determine which one is better.

<Property_Details>
{property_context}
</Property_Details>

<Location_Context>
{location_context}
</Location_Context>

Provide a comparison based on just the context above including:

- Property specifications in markdown table format
- Location advantages
- Market trends
- Value for money

Finish with a clear final recommendation explaining which property is better and why.

Answer:
"""
        )

        multi_context_chain = (
            {
                "property_context": RunnableLambda(property_retriever),
                "location_context": (RunnableLambda(location_retriever) | format_docs)
            }
            | multi_context_prompt
            | llm
            | StrOutputParser()
        )

        result = multi_context_chain.invoke({
            "id1": payload.id1,
            "id2": payload.id2
        })

        return {
            "id1": payload.id1,
            "id2": payload.id2,
            "comparison": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 5. Price Prediction Endpoint
# ==========================================


@app.post("/predict-price", response_model=PricePredictionResponse)
async def predict_price(request: Request, payload: PricePredictionRequest):
    """
    Predicts the price of a property using the trained XGBoost model.
    Accepts location, property_type, m2, Beds, and Baths as input.
    """
    try:
        import joblib
        import numpy as np

        # Load model and encoder (cached on app state if already loaded)
        if not hasattr(request.app.state, "price_model"):
            request.app.state.price_model = joblib.load("price_model/best_xgb_model.joblib")
            request.app.state.price_encoder = joblib.load("price_model/location_encoder.joblib")

        loaded_model = request.app.state.price_model
        loaded_encoder = request.app.state.price_encoder

        df_main = request.app.state.df  # Main DataFrame for loc_price_std calculation

        # Build single-row DataFrame from input
        sample_data = {
            "location": payload.location,
            "property_type": payload.property_type,
            "m2": payload.m2,
            "Beds": payload.Beds,
            "Baths": payload.Baths,
        }
        df_single = pd.DataFrame([sample_data])

        # a. Feature: is_luxury (on original scale)
        df_single["is_luxury"] = (df_single["m2"] > 200).astype(int)

        # b. Log transform m2
        df_single["m2"] = np.log1p(df_single["m2"])

        # c. Target encode location
        df_single["location"] = loaded_encoder.transform(df_single[["location"]])

        # d. Ratio features
        df_single["bed_bath_ratio"] = df_single["Beds"] / (df_single["Baths"] + 1)
        df_single["total_rooms"] = df_single["Beds"] + df_single["Baths"]
        df_single["m2_per_bed"] = df_single["m2"] / (df_single["Beds"] + 1)

        # e. Location stats (using main df)
        df_single["loc_price_mean"] = df_single["location"]
        df_single["loc_price_std"] = df_main.groupby("location")["price_float"].std().mean()

        # f. One-hot encode property_type to match training columns exactly
        model_features = loaded_model.feature_names_in_

        for col in model_features:
            if col.startswith("property_type_"):
                prop_name = col.replace("property_type_", "")
                df_single[col] = 1 if payload.property_type == prop_name else 0

        # Align columns to model's expected input
        df_single = df_single[model_features]

        # Predict and inverse log-transform
        log_prediction = loaded_model.predict(df_single)[0]
        final_price = float(np.expm1(log_prediction))

        return {
            "location": payload.location,
            "property_type": payload.property_type,
            "m2": payload.m2,
            "Beds": payload.Beds,
            "Baths": payload.Baths,
            "predicted_price_egp": final_price,
            "predicted_price_formatted": f"{final_price:,.2f} EGP",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))