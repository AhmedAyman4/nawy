# Property Recommender System - API Documentation

This documentation provides details for the backend API of the Nawy Property Recommender. The system integrates semantic search, Retrieval-Augmented Generation (RAG) for location insights, and machine learning for price prediction.

- **Base URL**: `http://localhost:8000`
- **Framework**: FastAPI 0.100+
- **Python Version**: 3.11+
- **Data Persistence**: MongoDB (Chat History), ChromaDB (Vector Store)

---

## API Endpoints

### Properties and Search

#### GET /properties
Retrieves a paginated collection of properties from the dataset, randomized by default for discovery.

**Query Parameters:**
- `page` (int, optional): The page number to retrieve. Default is `1`.
- `size` (int, optional): The number of records per page. Default is `20`.

**Response (PaginatedPropertyResponse):**
Returns a JSON object containing a `data` array of `PropertyResponse` objects and pagination metadata (`total`, `page`, `size`, `total_pages`).

---

#### GET /filter-options
Fetches unique values for `location` and `property_type` from the property database. This is intended to populate frontend filter dropdowns.

**Response Schema:**
```json
{
  "locations": ["List of strings representing valid locations"],
  "property_types": ["List of strings representing valid property types"]
}
```

---

#### POST /filter
Performs structured filtering on the property database based on specific criteria.

**Request Body (FilterRequest):**
- `location` (string, optional): Substring match for the location.
- `property_type` (string, optional): Substring match for the property type.
- `Beds` (float, optional): Number of bedrooms. If 5 or greater, filters for "5 or more".
- `Baths` (float, optional): Number of bathrooms. If 5 or greater, filters for "5 or more".
- `min_price` (float, optional): Minimum price threshold (EGP).
- `max_price` (float, optional): Maximum price threshold (EGP).
- `page` (int, optional): Page number (Default: 1).
- `size` (int, optional): Page size (Default: 20).

---

#### POST /recommend
An intelligent search endpoint that combines vector similarity search with LLM-based filtering.

**Process Workflow:**
1. **Vector Retrieval**: Performs a similarity search in ChromaDB using `Qwen/Qwen3-Embedding-0.6B`.
2. **LLM Filtering**: Takes the top `top_k` results and uses Groq (Llama 3.1) to generate Python filtering code based on the natural language query.
3. **Execution**: Dynamically executes the generated code against the retrieved subset to return the final list.

**Request Body (QueryRequest):**
- `query` (string, required): The natural language search query.
- `top_k` (int, optional): Number of initial vector results to consider (Default: 150).

**Response:**
Includes a `debug` field detailing the vectorstore hits, the LLM-generated filter code, and execution results for transparency.

---

### AI Chat and Knowledge Retrieval (RAG)

#### POST /chat
An interactive endpoint for asking questions about compounds and locations.

**Request Body (ChatRequest):**
- `question` (string, required): The user's query about a location.
- `session_id` (string, optional): Unique identifier for chat history persistence (Default: "default").

**Key Features:**
- **Query Rewriting**: If history exists, the LLM rewrites the question to be self-contained for better retrieval.
- **Hybrid Context**: Retrieves documents from the `locations_and_compounds_db` (ChromaDB) to provide factual answers.
- **Preference Extraction**: Every 3 turns, the system automatically extracts user preferences (e.g., "likes New Cairo", "budget is 10M") and saves them to MongoDB.

---

#### GET /chat/{session_id}/history
Retrieves the full conversation history for a given session.

#### GET /chat/{session_id}/preferences
Retrieves the user profile extracted by the AI from previous conversations. This includes preferred locations, budget ranges, and lifestyle preferences.

#### DELETE /chat/{session_id}
Clears the conversation and message history stored in MongoDB for the specified session.

---

### Comparison and Price Prediction

#### POST /compare
Takes two property IDs and generates a comprehensive AI comparison report.

**Request Parameters:**
- `id1` (string, required): First property ID.
- `id2` (string, required): Second property ID.

**Logic:**
Constructs a dual-context prompt containing technical details of both properties and relevant geographical facts about their respective locations.

---

#### POST /predict-price
Predicts the market price of a property using a trained XGBoost regression model.

**Request Body (PricePredictionRequest):**
- `location` (string): The property location.
- `property_type` (string): The type (e.g., Apartment, Villa).
- `m2` (float): Total area in square meters.
- `Beds` (float): Number of bedrooms.
- `Baths` (float): Number of bathrooms.

**Model Details:**
The model uses several engineered features:
- `is_luxury`: Boolean based on `m2 > 200`.
- `bed_bath_ratio`: Ratio of bedrooms to bathrooms.
- `loc_price_mean`: Historical average price in that location.
The output is returned as both a raw float (`predicted_price_egp`) and a human-readable string.

---

## Data Models

### PropertyResponse (Field Descriptions)
- `id`: Unique identifier from the source data.
- `location`: Specific compound or area name.
- `property_name`: Title of the property listing.
- `description`: Full textual description as scraped.
- `m2`: Area in square meters.
- `Beds`: Count of bedrooms.
- `Baths`: Count of bathrooms.
- `price`: Original formatted price string.
- `price_float`: Numeric price value for sorting/filtering.
- `url_path`: Relative URL to the original listing on Nawy.
- `cover_image`: URL to the primary property image.

### UserPreferenceSchema
Stored in MongoDB under `user_preferences` collection:
- `preferred_locations`: List of areas the user showed interest in.
- `budget_range`: Extracted min/max price expectations.
- `property_specs`: Preferred bed/bath counts and sizes.
- `summary_of_intent`: A generated summary of what the user is looking for.

---

## Configuration and Setup

The application heavily relies on environment variables and local files. 

### Environment Variables
- `GROQ_API_KEY`: Required. Used to authenticate with Groq for Llama 3.1 inference.
- `MONGO_URI`: Required. Connection string for MongoDB for storing user preferences and chat history.
- `ALLOWED_ORIGINS`: Optional (Default: `http://localhost:3000`). Comma-separated list of origins for CORS middleware.
- `LANGCHAIN_API_KEY`: Required. The app uses the `langsmith` client to dynamically pull prompts (e.g., `recommend_prompt`, `property_location_prompt`).

### LangSmith Prompts in Use
The API pulls the following prompts dynamically from LangSmith:
- `extract_preferences_from_history_prompt`
- `recommend_prompt`
- `chat_history_rewrite_prompt`
- `property_location_prompt`
- `compare_multi_context_prompt`

### Data Dependencies
On startup (configured in the FastAPI lifespan), the app expects the following files and directories to exist in the `backend` folder:
- `nawy_properties_cleaned.csv`: Cleaned property dataset loaded into a Pandas DataFrame.
- `./property_recommender_db/`: Directory containing the ChromaDB vectorstore for property search.
- `./locations_and_compounds_db/`: Directory containing the ChromaDB vectorstore for location-based RAG chat.
- `./price_model/best_xgb_model.joblib`: Pre-trained XGBoost model for price prediction.
- `./price_model/location_encoder.joblib`: Label encoder for location strings used by the price model.

### Utility Endpoints
- `GET /` and `GET /ping`: Basic health check endpoints returning the API status.
