<div align="center">

<img src="frontend/public/favicon.svg" alt="AI Real Estate Chat Consultant Logo" width="64" height="64" style="margin-bottom: 0.5rem;" />

# AI Real Estate Chat Consultant



![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-green?logo=chainlink&logoColor=white)
![LangSmith](https://img.shields.io/badge/LangSmith-Tracing-orange)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange)
![XGBoost](https://img.shields.io/badge/ML-XGBoost-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
[![Hugging Face Spaces](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-Spaces-blue)](https://huggingface.co/spaces/ahmed-ayman/nawy-property-recommender)
[![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?logo=netlify&logoColor=white)](https://nawy.netlify.app/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel&logoColor=white)](https://nawyai.vercel.app/)

A comprehensive real-estate platform that leverages natural language chat, semantic search, AI-driven recommendations, and price prediction to help users find their ideal property on [Nawy.com](https://www.nawy.com/).

## Overview

The **AI Real Estate Chat Consultant** is an end-to-end solution designed to transform how users search for real estate by replacing rigid filters with natural language queries. Beyond searching for properties, the system features an intelligent **AI Consultant** that allows users to chat and ask deep-dive questions about **locations, compounds, and community details** including up-to-date information on nearby **schools, hospitals, sports clubs, and lifestyle facilities** by combining data scraping, advanced preprocessing, vector-based semantic search, and Large Language Models (LLMs) to provide a comprehensive "digital property consultant" experience.

</div>

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

<p align="center">
  <img src="backend/assets/diagrams/architecture/high-level-architecture-diagram-adaptive.png" alt="High Level Architecture" />
</p>

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

<img src="backend/assets/diagrams/search/natural-language-search-sequence-diagram.png" alt="Natural Language Search Sequence Diagram" width="500" />

### 2. **AI Personal Consultant (RAG Chat)**
- **Location Insights**: Chatbot that answers questions about specific areas/compounds using RAG (Retrieval-Augmented Generation).
- **Property Comparison**: Ask the AI to compare two properties to get a detailed pros/cons analysis and recommendation.
- **Dynamic User Profiling**: Automatically creates and refines user preference profiles during the conversation to provide increasingly relevant and tailored recommendations.
- **RAG Test Dataset**: A curated set of location-based Q&A used for testing RAG accuracy can be found [here](backend/assets/future-improvements/rag-test-data.md).


**Chat Endpoint Sequence Diagram**

<img src="backend/assets/diagrams/chat/chat-endpoint-sequence-diagram.png" alt="Chat Endpoint Sequence Diagram" width="500" />

**Compare Parallel RAG sequence diagram**

<img src="backend/assets/diagrams/compare/Compare-Parallel-RAG-sequence-diagram.png" alt="Compare Parallel RAG sequence diagram" width="500" />

### 3. **Smart Price Prediction**
- **XGBoost Engine**: Predicts property prices based on location, size, property type, and features.
- **Luxury Analysis**: Incorporates feature engineering like `is_luxury` and `m2_per_bed` for high accuracy.

**Price Prediction Sequence Diagram**

<img src="backend/assets/diagrams/prediction/price-prediction-sequence-diagram.png" alt="Price Prediction Sequence Diagram" width="500" />

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
