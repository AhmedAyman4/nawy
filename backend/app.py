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
            df = df[df['Beds'] >= payload.Beds]

        if payload.Baths is not None:
            df = df[df['Baths'] >= payload.Baths]

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


@app.post("/recommend", response_model=PaginatedPropertyResponse)
async def get_recommendations(request: Request, payload: QueryRequest):
    try:
        query = payload.query
        top_k = payload.top_k
        page = payload.page
        size = payload.size
        
        # Access state variables initialized during lifespan
        df = request.app.state.df
        vectorstore = request.app.state.vectorstore
        llm = request.app.state.llm

        if not query.strip():
            return {
                "data": [],
                "total": 0,
                "page": page,
                "size": size,
                "total_pages": 0
            }

        # Step 1: Base Retrieval (Semantic Search)
        recommendations = vectorstore.similarity_search(query, k=top_k)
        recommendation_ids = [doc.metadata.get('id') for doc in recommendations if doc.metadata.get('id')]
        
        if not recommendation_ids:
            return {
                "data": [],
                "total": 0,
                "page": page,
                "size": size,
                "total_pages": 0
            }
            
        recommended_df = df[df['id'].isin(recommendation_ids)].copy()

        if recommended_df.empty:
            return {
                "data": [],
                "total": 0,
                "page": page,
                "size": size,
                "total_pages": 0
            }

        # Step 2: Run LLM to generate pandas filtering code based on natural language query
        columns_str = str(['m2', 'Beds', 'Baths', 'price_float'])
        prompt = ChatPromptTemplate.from_template("""
        Given this DataFrame info:
        Columns: {columns}
        
        Generate Python pandas code based on just the columns above to this: {query}.
        Rules:
        - Use ONLY the provided columns.
        - Store the result in a variable called df_filtered.
        - The output must be a pandas filtering operation on recommended_df.
        - Return ONLY the raw pandas code on a single line.
        - DO NOT use markdown formatting, DO NOT use backticks (```), and DO NOT add explanations.
        """)

        chain = prompt | llm

        raw_code = chain.invoke({
            "columns": columns_str,
            "query": query
        }).content.strip()

        code = clean_llm_code(raw_code)
        print(f"Executing Generated Code:\n{code}")

        exec_locals = {
            "pd": pd,
            "recommended_df": recommended_df
        }

        try:
            exec(code, {}, exec_locals)
            df_filtered = exec_locals.get("df_filtered")
            
            if df_filtered is None:
                raise ValueError("LLM code did not produce 'df_filtered' variable.")
        except Exception as exec_error:
            print(f"Code execution failed: {exec_error}")
            df_filtered = recommended_df

        # Pagination Logic
        total_records = len(df_filtered)
        total_pages = math.ceil(total_records / size) if size > 0 else 1
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        
        df_paginated = df_filtered.iloc[start_idx:end_idx]

        # Step 3: Format Final Response
        cols_to_keep = [
            'id', 'location', 'property_name', 'description',
            'm2', 'Beds', 'Baths', 'payment_plan', 'price', 'tag',
            'url_path', 'cover_image', 'developer_logo', 'price_float', 'property_type'
        ]
        
        available_cols = [col for col in cols_to_keep if col in df_paginated.columns]
        df_recommendations_input = df_paginated[available_cols]

        # Convert to dictionary FIRST, then natively replace NaNs with None 
        # This prevents Pandas from forcing None back into NaN in numeric columns
        records = df_recommendations_input.to_dict(orient='records')
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


@app.get("/ping")
async def ping_pong():
    return {"ping": "pong"}