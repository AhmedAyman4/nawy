<div align="center">

<img src="frontend/public/favicon.svg" alt="AI Real Estate Chat Consultant Logo" width="48" height="48" style="margin-bottom: 0.5rem;" />

# AI Real Estate Chat Consultant


![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-green?logo=chainlink&logoColor=white)
[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces-blue)](https://huggingface.co/spaces/ahmed-ayman/nawy-property-recommender)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel&logoColor=white)](https://nawyai.vercel.app/)

A comprehensive real-estate platform that leverages natural language chat, semantic search, AI-driven recommendations, and price prediction to help users find their ideal property on [Nawy.com](https://www.nawy.com/).

<!-- <img src="backend/assets/future-improvements/nawy-property-recommender.png" alt="Nawy Property Recommender Showcase" /> -->

</div>

## Overview

The **AI Real Estate Chat Consultant** is an end-to-end solution designed to transform how users search for real estate by replacing rigid filters with natural language queries. Beyond searching for properties, the system features an intelligent **AI Consultant** that allows users to chat and ask deep-dive questions about **locations, compounds, and community details** including up-to-date information on nearby **schools, hospitals, sports clubs, and lifestyle facilities** by combining data scraping, advanced preprocessing, vector-based semantic search, and Large Language Models (LLMs) to provide a comprehensive "digital property consultant" experience.


---

### The Problem & The Solution

**The Challenge:**
In the real estate industry, **Lead Qualification** is a critical bottleneck. Leads require immediate responses to maintain interest, yet sales teams often face:
- **Availability & Capacity:** Scaling human teams to handle 24/7 inquiries is expensive and difficult to manage.
- **Knowledge Overhead:** Training sales agents on the vast details of every project, location, and compound is time-intensive.
- **High Turnover:** This role typically has high turnover, leading to constant retraining and lost expertise.

**Solution:**
This project focuses on **automated lead engagement and qualification**. By providing instant, expert-level knowledge on projects and properties, it ensures no lead is lost to delays. It acts as a consistent, 24/7 digital consultant that **dynamically builds and updates user profiles based on chat interactions**, ensuring a highly personalized search experience and bridging the gap between user interest and sales conversion.

---

## High Level Architecture

```mermaid
graph TD
    %% Client Layer
    User((User / Frontend)) -->|HTTP Requests| API

    %% Main Logic Layer
    subgraph FASTAPI["FASTAPI BACKEND SYSTEM"]
        direction TB
        API[FastAPI Gateway]
        
        API -->|1. Startup| Lifespan[Lifespan Manager]
        Lifespan -->|Loads| Data[(nawy_properties_cleaned.csv)]
        Lifespan -->|Loads| XGB[XGBoost & Label Encoder]
        Lifespan -->|Initializes| Embed[Qwen Embedding Model]

        %% Endpoints
        API -->|/recommend| RecEngine[Recommendation Engine]
        API -->|/chat| RAG[Location RAG Chat]
        API -->|/compare| Compare[Comparison Engine]
        API -->|/predict-price| PricePred[Price Predictor]
        API -->|/filter| Filter[Standard Filter]
        
        %% Internal Logic
        RAG -->|History Management| MongoHistory[MongoDBChatMessageHistory]
        RAG -->|Every N Turns| PrefLogic[maybe_update_preferences]
        
        RecEngine -->|Executes| PyFilter[LLM Python Code Executor]
    end

    %% Storage & AI Layer
    subgraph AI["AI & DATA INFRASTRUCTURE"]
        direction TB
        RecEngine -->|Similarity Search| ChromaProp[(ChromaDB: Properties)]
        RecEngine -->|Dynamic Code Gen| Groq[[Groq: Llama 3.1]]
        
        RAG -->|Context Retrieval| ChromaLoc[(ChromaDB: Locations)]
        RAG -->|Query Rewriting| Groq
        
        Compare -->|Property Specs| Data
        Compare -->|Location Retrieval| ChromaLoc
        Compare -->|Synthesis| Groq

        PricePred -->|Log1p + Feature Eng| XGB
    end

    %% Persistence Layer
    subgraph PERSIST["PERSISTENCE LAYER (MONGODB)"]
        MongoHistory <-->|Read/Write| ChatCol[(Collection: chat_history)]
        PrefLogic <-->|Upsert Profile| PrefCol[(Collection: user_preferences)]
    end

    %% External Monitoring & Prompts
    subgraph OBSERV["OBSERVABILITY & PROMPT HUB"]
        Groq <-->|Traceable| LangSmith[LangSmith Client]
        LangSmith -.->|Pull Prompts| RecEngine
        LangSmith -.->|Pull Prompts| RAG
        LangSmith -.->|Pull Prompts| PrefLogic
        LangSmith -.->|Pull Prompts| Compare
    end
```

---

## Project Structure

```text
nawy/
├── 01-nawy-scraping/           # Data collection using Playwright & BeautifulSoup
├── 02-data-preprocessing/      # Data cleaning, feature engineering, and normalization
├── 03-embedding-semantic-search/# Vector DB (ChromaDB) & Price Prediction (XGBoost)
├── backend/                    # Modular FastAPI server
│   ├── main.py                 # API Entry point and router inclusion
│   ├── core/                   # System configuration and lifecycle management
│   │   ├── config.py           # Global settings, MongoDB URIs, and shared schemas
│   │   └── lifespan.py         # App startup/shutdown logic (DBs, Models, Vectorstores)
│   ├── routers/                # Feature-based API routes
│   │   ├── general.py          # Root and health-check endpoints
│   │   ├── properties.py       # Property browsing, filtering, and recommendations
│   │   ├── chat.py             # AI Chat, history management, and intent detection
│   │   ├── compare.py          # Property comparison logic
│   │   └── predict.py          # Price prediction model interface
│   ├── schemas/                # Pydantic data validation models
│   │   └── models.py           # All API request/response models
│   ├── utils/                  # Helper functions and business logic
│   │   └── helpers.py          # LLM code cleaning, user preference updates, etc.
│   └── app.py                  # Legacy combined script (to be deprecated)
├── frontend/                   # Next.js 16 + Tailwind CSS 4 user interface
└── README.md                   # Project overview and documentation
```

---

## Key Features

### 1. **Semantic Search & Recommendations**
- **Natural Language Queries**: Search for properties using descriptive language.
- **Hybrid Filtering**: Combines vector similarity search (ChromaDB) with LLM-parsed numeric constraints (Price, Beds, Baths).
- **Intelligent Ranking**: Uses state-of-the-art embeddings (`Qwen/Qwen3-Embedding-0.6B`) for highly relevant results.

**Natural Language Search Sequence Diagram**

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as FastAPI (recommend)
    participant VDB as ChromaDB (Vectorstore)
    participant LLM as Groq (Llama 3.1)
    participant DF as Pandas DataFrame

    Client->>API: POST /recommend (query, top_k)
    
    Note over API, VDB: Semantic Search Phase
    API->>VDB: similarity_search(query, k=top_k)
    VDB-->>API: List of Documents (Metadata)
    API->>API: Extract IDs from Metadata

    Note over API, DF: Data Retrieval Phase
    API->>DF: Filter rows where ID in extracted_ids
    DF-->>API: recommended_df (Sub-dataframe)

    Note over API, LLM: Intelligent Filtering Phase
    API->>LLM: Send query + column schemas
    LLM-->>API: Return Python code string (df_filtered)

    Note over API: Execution & Fallback
    API->>API: exec(generated_code)
    alt Execution Success
        API->>API: Use df_filtered
    else Execution Error / Empty Result
        API->>API: Fallback to original recommended_df
    end

    API->>API: Apply Pagination (page, size)
    API-->>Client: Return JSON (data, total, debug)
```

### 2. **AI Personal Consultant (RAG Chat)**
- **Location Insights**: Chatbot that answers questions about specific areas/compounds using RAG (Retrieval-Augmented Generation).
- **Property Comparison**: Ask the AI to compare two properties to get a detailed pros/cons analysis and recommendation.
- **Dynamic User Profiling**: Automatically creates and refines user preference profiles during the conversation to provide increasingly relevant and tailored recommendations.
- **RAG Test Dataset**: A curated set of location-based Q&A used for testing RAG accuracy can be found [here](backend/assets/future-improvements/rag-test-data.md).


**Chat Endpoint Sequence Diagram**

```mermaid
sequenceDiagram
    autonumber
    
    participant User
    participant API
    participant MongoDB
    participant LangSmith
    participant Groq as Groq (Smart LLM)
    participant ChromaLoc

    Note over User, API: Request Phase
    User->>API: POST /chat (question, session_id)
    API->>API: _get_history(session_id)
    alt Mongo Available
        API->>MongoDB: Initialize MongoDBChatMessageHistory
        MongoDB-->>API: history_messages
    else Mongo Unavailable (Fallback)
        Note over API: Use local_chat_histories (In-Memory)
    end

    Note over API, Groq: Intent Detection (New Logic)
    API->>LangSmith: Pull "is_property_search_prompt"
    API->>Groq: Detect search intent
    Groq-->>API: is_property_search (True/False)
    
    opt If is_property_search == True
        API->>API: get_recommendations(payload)
        Note right of API: Executes Vector Search + LLM Filtering
        API->>User: ChatResponse (answer + properties list)
    end

    Note over API, Groq: Standard RAG Flow (If search intent is False)
    alt history_messages exists
        API->>LangSmith: Pull "chat_history_rewrite_prompt"
        API->>Groq: Rewrite question based on history
        Groq-->>API: retriever_query
    else No history
        Note over API: retriever_query = original question
    end

    API->>ChromaLoc: Similarity Search (k=10)
    ChromaLoc-->>API: retrieved_docs (context)
    
    API->>LangSmith: Pull "property_location_prompt"
    API->>Groq: Generate answer (context + history + question)
    Groq-->>API: answer

    Note over API, MongoDB: Persistence & Safe Preferences
    API->>API: Save User & AI messages (Mongo or Local)
    
    par Async Preference Update (Safe)
        API->>API: maybe_update_preferences_safe()
        Note right of API: If turn_counter % 3 == 0
        API->>LangSmith: Pull "extract_preferences_from_history_prompt"
        API->>Groq: Extract profile from new messages
        Groq-->>API: Extracted JSON
        API->>API: _safe_save_preference_doc()
        Note right of API: Upserts to MongoDB or local_preferences
    end

    API-->>User: ChatResponse (answer, session_id, history_length)
```

**Compare Parallel RAG sequence diagram**

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI /compare
    participant DF as app.state.df (CSV)
    participant VS as location_vectorstore (ChromaDB)
    participant LLM as Groq LLM (Llama-3.1)

    Client->>API: POST /compare (id1, id2)
    
    Note over API, VS: RunnableParallel Phase
    
    par Property Data Retrieval
        API->>DF: Filter rows where ID is in [id1, id2]
        DF-->>API: Return property specs (m2, Beds, Price, etc.)
        API->>API: format into "property_context" string
    and Location Context Retrieval
        API->>VS: similarity_search (query context for id1 & id2)
        VS-->>API: Return relevant document chunks
        API->>API: format into "location_context" string
    end

    API->>API: Pull 'compare_multi_context_prompt_v1' from LangSmith
    
    API->>LLM: Send Prompt (Property Context + Location Context)
    LLM-->>API: Return Structured Comparison Analysis
    
    API-->>Client: JSON Response (id1, id2, comparison_text)
```

### 3. **Smart Price Prediction**
- **XGBoost Engine**: Predicts property prices based on location, size, property type, and features.
- **Luxury Analysis**: Incorporates feature engineering like `is_luxury` and `m2_per_bed` for high accuracy.

**Price Prediction Sequence Diagram**

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant API as FastAPI (predict_price)
    participant Encoder as Location Encoder (Joblib)
    participant Model as XGBoost Model (Joblib)
    participant DF as Reference DataFrame

    Client->>API: POST /predict-price (location, m2, beds, etc.)
    
    Note over API, DF: Feature Engineering Phase
    API->>API: Calculate 'is_luxury' (m2 > 200)
    API->>API: Apply Log Transformation: log1p(m2)
    API->>Encoder: transform(location)
    Encoder-->>API: Label Encoded Location
    API->>DF: Get Mean/Std price for location context
    API->>API: Compute Ratios (bed_bath_ratio, m2_per_bed)

    Note over API, Model: Inference Phase
    API->>API: Align features with model_features_in
    API->>Model: predict(df_single)
    Model-->>API: log_prediction (Float)

    Note over API: Post-Processing
    API->>API: Inverse Log Transform: expm1(log_prediction)
    API->>API: Format currency string (EGP)

    API-->>Client: Return PricePredictionResponse
```

### 4. **Modern Web UI**
- **Responsive Design**: Optimized for mobile and desktop.
- **Interactive Experience**: Paginated results, filter chips, and real-time AI chat.

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide Icons |
| **Backend** | FastAPI, Uvicorn, Pydantic, Python 3.11 |
| **AI/ML** | LangChain, HuggingFace (Qwen Embeddings), Groq (Llama 3.1), XGBoost |
| **Database** | ChromaDB (Vector Store), Pandas (Structured Data) |
| **Scraping** | Playwright, BeautifulSoup4 |

---

## Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API Key (for LLM features)

### Backend Setup
1. Ensure you are in the project root directory.
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Set your environment variables:
   - **GROQ_API_KEY**: Required for LLM functionality (from Groq Cloud).
   - **MONGO_URI**: Required for chat history and user preference storage.
   ```bash
   # Windows
   $env:GROQ_API_KEY="your_groq_key"
   $env:MONGO_URI="your_mongodb_uri"
   # Linux/Mac
   export GROQ_API_KEY=your_groq_key
   export MONGO_URI=your_mongodb_uri
   ```
4. Run the modular server from the project root:
   ```bash
   uvicorn backend.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## Data Pipeline

1. **Scraping**: `01-nawy-scraping` crawls Nawy.com to extract nearly **9,000 properties**, **1,700+ compounds**, **40+ locations**, and **600+ blogs**, along with nearly **20,000 properties** from Property Finder to ensure a robust and comprehensive dataset.
2. **Preprocessing**: `02-data-preprocessing` cleans text, handles missing values, and prepares numeric fields for ML.
3. **Indexing**: `03-embedding-semantic-search` converts text descriptions into vector embeddings and stores them in ChromaDB.
4. **Modeling**: Trains an XGBoost model on the cleaned dataset for price estimation.

---

## Roadmap and Future Improvements

For a detailed look at the future of this project, including our transition to a multi-agent "Agentverse" architecture, please refer to the [Future Improvements Roadmap](backend/assets/future-improvements/FUTURE_IMPROVEMENTS.md).
