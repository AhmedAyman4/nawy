import os
import re
import math
import joblib
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
from langchain_core.messages import HumanMessage, AIMessage
from langchain_mongodb.chat_message_histories import MongoDBChatMessageHistory

from langchain_core.runnables import RunnablePassthrough, RunnableParallel, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

from langsmith import traceable
from langsmith import Client
client = Client()

import json
from datetime import datetime, timezone
from pymongo import MongoClient

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
    session_id: str = "default"

class ChatResponse(BaseModel):
    question: str
    answer: str
    session_id: str
    history_length: int

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
# 2. MongoDB Chat History Config
# ==========================================
MONGO_URI = os.environ.get("MONGO_URI")
MONGO_DB_NAME = "nawy-property-recommender-v1"
MONGO_COLLECTION_NAME = "chat_history"
HISTORY_MESSAGES_LIMIT = 5

# ==========================================
# User Preference Profile Config
# ==========================================
MONGO_PREFERENCES_COLLECTION = "user_preferences"
PREFERENCE_EXTRACTION_EVERY_N_TURNS = 3

USER_PREFERENCE_SCHEMA = {
    "user_id": None,
    "last_updated": None,
    "preferred_locations": [],
    "property_specs": {
        "types": [],
        "beds": None,
        "baths": None,
        "m2": None
    },
    "budget_range": {
        "min": None,
        "max": None
    },
    "lifestyle_preferences": [],
    "investment_intent": None,
    "summary_of_intent": "",
    "turn_counter": 0
}

# ==========================================
# Compound RAG Prompt
# ==========================================
def _detect_intent(question: str, llm) -> str:
    """Returns 'compound' or 'location'."""
    intent_prompt = ChatPromptTemplate.from_template(
        "Classify this real estate question into exactly one word: 'compound' if it asks about a specific compound, project, or developer, "
        "or 'location' if it asks about an area, neighborhood, or city.\n\nQuestion: {question}\n\nAnswer with one word only:"
    )
    result = (intent_prompt | llm | StrOutputParser()).invoke({"question": question})
    return "compound" if "compound" in result.strip().lower() else "location"


# ==========================================
# 3. App Lifespan (Startup & Shutdown)
# ==========================================
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

    print("Loading Location Information VectorDB...")
    app.state.location_vectorstore = Chroma(
        persist_directory="./location_information_db",
        embedding_function=embeddings
    )
    print("Location VectorDB loaded!")

    print("Loading Compound Information VectorDB...")
    app.state.compound_vectorstore = Chroma(
        persist_directory="./compound_information_db",
        embedding_function=embeddings
    )
    print("Compound VectorDB loaded!")

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

    print("Initializing shared MongoDB client...")
    app.state.mongo_client = MongoClient(MONGO_URI)
    print("MongoDB client ready!")

    print("🚀 API is ready!")
    yield
    print("Shutting down API...")
    app.state.mongo_client.close()

# ==========================================
# 4. Initialize FastAPI App
# ==========================================
app = FastAPI(
    title="Property Recommender System API",
    description="Semantic real estate recommendation engine using ChromaDB and Groq LLM.",
    version="1.0.0",
    lifespan=lifespan
)

raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_llm_code(raw_code: str) -> str:
    cleaned = re.sub(r"^```python\n", "", raw_code, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\n", "", cleaned)
    cleaned = re.sub(r"```$", "", cleaned)
    return cleaned.strip()


# ==========================================
# User Preference Helpers
# ==========================================
def _get_preferences_collection(mongo_client: MongoClient):
    db = mongo_client[MONGO_DB_NAME]
    return db[MONGO_PREFERENCES_COLLECTION]


def _load_preference_doc(session_id: str, mongo_client: MongoClient) -> dict:
    col = _get_preferences_collection(mongo_client)
    doc = col.find_one({"user_id": session_id})
    if doc is None:
        doc = dict(USER_PREFERENCE_SCHEMA)
        doc["user_id"] = session_id
    return doc


def _save_preference_doc(doc: dict, mongo_client: MongoClient) -> None:
    col = _get_preferences_collection(mongo_client)
    col.update_one(
        {"user_id": doc["user_id"]},
        {"$set": doc},
        upsert=True
    )


def _extract_preferences_from_history(new_user_messages: list[str], existing_profile: dict, llm) -> dict:
    if not new_user_messages:
        return {}

    new_questions_text = "\n".join(f"- {msg}" for msg in new_user_messages)

    current_profile_text = json.dumps(
        {k: v for k, v in existing_profile.items() if k not in ("user_id", "last_updated", "turn_counter", "_id")},
        indent=2
    )

    extraction_prompt = client.pull_prompt("extract_preferences_from_history_prompt")
    preference_chain = extraction_prompt | llm
    response = preference_chain.invoke({
        "current_profile_text": current_profile_text,
        "new_questions_text": new_questions_text
    })

    raw = response.content.strip()
    raw = re.sub(r"^```json\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"```$", "", raw)

    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return {}


def maybe_update_preferences(session_id: str, all_messages, llm, mongo_client: MongoClient) -> None:
    try:
        doc = _load_preference_doc(session_id, mongo_client)
        doc["turn_counter"] = doc.get("turn_counter", 0) + 1

        if doc["turn_counter"] % PREFERENCE_EXTRACTION_EVERY_N_TURNS == 0:
            already_processed = doc.get("processed_user_message_count", 0)

            all_user_texts = [
                msg.content
                for msg in all_messages
                if isinstance(msg, HumanMessage)
            ]

            new_user_texts = all_user_texts[already_processed:]

            if new_user_texts:
                extracted = _extract_preferences_from_history(new_user_texts, doc, llm)

                if extracted:
                    for field in [
                        "preferred_locations", "property_specs",
                        "budget_range", "lifestyle_preferences",
                        "investment_intent", "summary_of_intent"
                    ]:
                        if field in extracted:
                            doc[field] = extracted[field]

                doc["processed_user_message_count"] = len(all_user_texts)

            doc["last_updated"] = datetime.now(timezone.utc).isoformat()

        _save_preference_doc(doc, mongo_client)

    except Exception as e:
        print(f"[preferences] Non-fatal error for session {session_id}: {e}")


# ==========================================
# 5. API Endpoints
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
        random_df = df.sample(frac=1, random_state=42)

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


@app.get("/filter-options")
async def get_filter_options(request: Request):
    df = request.app.state.df
    locations = df['location'].dropna().unique().tolist() if 'location' in df.columns else []
    property_types = df['property_type'].dropna().unique().tolist() if 'property_type' in df.columns else []
    return {
        "locations": sorted(locations),
        "property_types": sorted(property_types)
    }


@app.post("/filter", response_model=PaginatedPropertyResponse)
async def filter_properties(request: Request, payload: FilterRequest):
    try:
        df = request.app.state.df.copy()

        if payload.location:
            df = df[df['location'].str.contains(payload.location, case=False, na=False)]

        if payload.property_type:
            df = df[df['property_type'].str.contains(payload.property_type, case=False, na=False)]

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

        if payload.min_price is not None:
            df = df[df['price_float'] >= payload.min_price]

        if payload.max_price is not None:
            df = df[df['price_float'] <= payload.max_price]

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

        recommendations = vectorstore.similarity_search(query, k=top_k)
        debug_info["vectorstore_hits"] = len(recommendations)

        recommendation_ids = []
        raw_ids_sample = []
        for doc in recommendations:
            raw_id = doc.metadata.get('id')
            if raw_id is not None:
                raw_ids_sample.append(raw_id)
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
            return {"data": [], "total": 0, "page": page, "size": size, "total_pages": 0, "debug": {**debug_info, "reason": "ID join returned 0 rows"}}

        columns_str = str(['m2', 'Beds', 'Baths', 'price_float'])
        recommend_prompt = client.pull_prompt("recommend_prompt")
        chain = recommend_prompt | llm
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
                debug_info["llm_filter_result"] = f"df_filtered was empty — falling back"
                df_filtered = recommended_df
            else:
                debug_info["llm_filter_result"] = f"OK — {len(df_filtered)} rows after filter"

        except Exception as exec_error:
            debug_info["llm_filter_result"] = f"exec() error: {str(exec_error)} — falling back"
            df_filtered = recommended_df

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


# ==========================================
# 6. Chat Location with MongoDB Memory
# ==========================================
@app.post("/chat", response_model=ChatResponse)
async def chat_about_location(request: Request, payload: ChatRequest):
    try:
        llm = request.app.state.llm
        location_vectorstore = request.app.state.location_vectorstore
        compound_vectorstore = request.app.state.compound_vectorstore

        if not payload.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        session_id = payload.session_id

        mongo_history = MongoDBChatMessageHistory(
            connection=request.app.state.mongo_client,
            database_name=MONGO_DB_NAME,
            collection_name=MONGO_COLLECTION_NAME,
            session_id=session_id,
        )

        history_messages = mongo_history.messages[-HISTORY_MESSAGES_LIMIT:]

        if history_messages:
            rewrite_prompt = client.pull_prompt("chat_history_rewrite_prompt")
            retriever_query = (rewrite_prompt | llm | StrOutputParser()).invoke({
                "chat_history": history_messages,
                "question": payload.question
            })
        else:
            retriever_query = payload.question

        intent = _detect_intent(retriever_query, llm)

        compound_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert Real Estate Consultant specializing in the Egyptian market.
Your goal is to provide accurate, professional, and helpful information about compounds and properties based on the data provided.

Strict Guidelines:
1. Answer ONLY using the context below. Do not invent amenities or prices.
2. If the context doesn't mention a specific detail (like 'delivery date' or 'down payment'), clearly state that it is not specified.
3. Highlight key selling points like location, developer reputation, and unique facilities.
4. Keep the tone professional, persuasive, and data-driven.

Context:
{context}"""),
            ("placeholder", "{chat_history}"),
            ("human", "{question}"),
        ])

        if intent == "compound":
            retrieved_docs = compound_vectorstore.as_retriever(search_kwargs={"k": 5}).invoke(retriever_query)
            context = "\n\n".join(doc.page_content for doc in retrieved_docs)
            response = (compound_prompt | llm).invoke({
                "context": context,
                "chat_history": history_messages,
                "question": payload.question
            })
        else:
            retrieved_docs = location_vectorstore.as_retriever(search_kwargs={"k": 5}).invoke(retriever_query)
            context = "\n\n".join(doc.page_content for doc in retrieved_docs)
            location_prompt = client.pull_prompt("property_location_prompt")
            response = (location_prompt | llm).invoke({
                "context": context,
                "chat_history": history_messages,
                "question": payload.question
            })

        answer = response.content.strip()

        mongo_history.add_user_message(payload.question)
        mongo_history.add_ai_message(answer)

        maybe_update_preferences(
            session_id=session_id,
            all_messages=mongo_history.messages,
            llm=llm,
            mongo_client=request.app.state.mongo_client
        )

        return {
            "question": payload.question,
            "answer": answer,
            "session_id": session_id,
            "history_length": len(mongo_history.messages) // 2
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/chat/{session_id}/preferences")
async def get_user_preferences(session_id: str, request: Request):
    doc = _load_preference_doc(session_id, request.app.state.mongo_client)
    doc.pop("_id", None)
    return doc


@app.delete("/chat/{session_id}")
async def clear_chat_history(session_id: str, request: Request):
    mongo_history = MongoDBChatMessageHistory(
        connection=request.app.state.mongo_client,
        database_name=MONGO_DB_NAME,
        collection_name=MONGO_COLLECTION_NAME,
        session_id=session_id,
    )
    mongo_history.clear()
    return {"message": f"History cleared for session '{session_id}'"}


@app.get("/chat/{session_id}/history")
async def get_chat_history(session_id: str, request: Request):
    mongo_history = MongoDBChatMessageHistory(
        connection=request.app.state.mongo_client,
        database_name=MONGO_DB_NAME,
        collection_name=MONGO_COLLECTION_NAME,
        session_id=session_id,
    )
    history = mongo_history.messages
    formatted = [
        {"role": "human" if isinstance(msg, HumanMessage) else "assistant", "content": msg.content}
        for msg in history
    ]
    return {
        "session_id": session_id,
        "history": formatted,
        "turns": len(formatted) // 2
    }


@app.post("/compare")
async def compare_properties(request: Request, payload: CompareRequest):
    try:
        df = request.app.state.df
        vectorstore = request.app.state.location_vectorstore
        llm = request.app.state.llm

        def get_properties_context(id1, id2, dataframe=df):
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
            return get_properties_context(inputs["id1"], inputs["id2"])

        def location_retriever(inputs):
            query = f"locations of properties {inputs['id1']} and {inputs['id2']}"
            return vectorstore.as_retriever(search_kwargs={"k": 5}).invoke(query)

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        multi_context_prompt = client.pull_prompt("compare_multi_context_prompt")

        multi_context_chain = (
            {
                "property_context": RunnableLambda(property_retriever),
                "location_context": (RunnableLambda(location_retriever) | format_docs)
            }
            | multi_context_prompt
            | llm
            | StrOutputParser()
        )

        result = multi_context_chain.invoke({"id1": payload.id1, "id2": payload.id2})

        return {"id1": payload.id1, "id2": payload.id2, "comparison": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 7. Price Prediction Endpoint
# ==========================================
@app.post("/predict-price", response_model=PricePredictionResponse)
async def predict_price(request: Request, payload: PricePredictionRequest):
    try:
        import numpy as np

        if not getattr(request.app.state, "price_model", None) or not getattr(request.app.state, "price_encoder", None):
            raise HTTPException(status_code=503, detail="Price prediction models are currently unavailable.")

        loaded_model = request.app.state.price_model
        loaded_encoder = request.app.state.price_encoder
        df_main = request.app.state.df

        sample_data = {
            "location": payload.location,
            "property_type": payload.property_type,
            "m2": payload.m2,
            "Beds": payload.Beds,
            "Baths": payload.Baths,
        }
        df_single = pd.DataFrame([sample_data])

        df_single["is_luxury"] = (df_single["m2"] > 200).astype(int)
        df_single["m2"] = np.log1p(df_single["m2"])
        df_single["location"] = loaded_encoder.transform(df_single[["location"]])
        df_single["bed_bath_ratio"] = df_single["Beds"] / (df_single["Baths"] + 1)
        df_single["total_rooms"] = df_single["Beds"] + df_single["Baths"]
        df_single["m2_per_bed"] = df_single["m2"] / (df_single["Beds"] + 1)
        df_single["loc_price_mean"] = df_single["location"]
        df_single["loc_price_std"] = df_main.groupby("location")["price_float"].std().mean()

        model_features = loaded_model.feature_names_in_
        for col in model_features:
            if col.startswith("property_type_"):
                prop_name = col.replace("property_type_", "")
                df_single[col] = 1 if payload.property_type == prop_name else 0

        df_single = df_single[model_features]
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