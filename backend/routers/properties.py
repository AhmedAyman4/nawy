import json
import math
import pandas as pd
from fastapi import APIRouter, HTTPException, Request
from langsmith import Client
from ..schemas.models import QueryRequest, FilterRequest, PaginatedPropertyResponse
from ..utils.helpers import clean_llm_code

router = APIRouter()
client = Client()

@router.get("/properties", response_model=PaginatedPropertyResponse)
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

@router.get("/filter-options")
async def get_filter_options(request: Request):
    df = request.app.state.df
    locations = df['location'].dropna().unique().tolist() if 'location' in df.columns else []
    property_types = df['property_type'].dropna().unique().tolist() if 'property_type' in df.columns else []
    return {
        "locations": sorted(locations),
        "property_types": sorted(property_types)
    }

@router.post("/filter", response_model=PaginatedPropertyResponse)
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

@router.post("/recommend")
async def get_recommendations(request: Request, payload: QueryRequest):
    debug_info = {}
    try:
        query = payload.query
        top_k = payload.top_k
        page = payload.page
        size = payload.size

        df = request.app.state.df
        vectorstore = request.app.state.vectorstore
        llm = request.app.state.smart_llm

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

        schema = {
            "numeric_columns": ["m2", "Beds", "Baths", "price_float"],
            "categorical_columns": {
                "location": [
                    "New Capital City", "6th settlement", "El Sheikh Zayed",
                    "6th of October City", "Madinaty", "El Shorouk", "October Gardens",
                    "New Cairo", "Mostakbal City", "South Investors", "Ras El Hekma",
                    "New Heliopolis", "New Zayed", "Northern Expansion", "New Capital Gardens",
                    "El Lotus", "Sidi Heneish", "Alexandria", "Al Alamein", "Hurghada",
                    "El Choueifat", "Al Dabaa", "Ain Sokhna", "Golden Square", "South New Cairo",
                    "Somabay", "Sidi Abdel Rahman", "El Gouna", "North Investors", "Maadi",
                    "Heliopolis", "North Coast-Sahel", "Central Cairo", "Old Cairo",
                    "New Sphinx", "Ghazala Bay", "Ras Sudr", "Sahl Hasheesh", "Makadi",
                    "Mokattam", "Downtown Cairo"
                ],
                "property_type": [
                    "Apartment", "Cabin", "Chalet", "Clinic", "Duplex", "Family House",
                    "Administrative", "Pharmacy", "Building", "Loft", "Office", "Penthouse",
                    "Retail", "Studio", "Townhouse", "Twinhouse", "Villa"
                ]
            }
        }
        columns_str = json.dumps(schema)
        recommend_prompt = client.pull_prompt("recommend_prompt")
        
        chain = recommend_prompt | llm
        raw_code = chain.invoke({"columns": columns_str, "query": query}).content.strip()
        code = clean_llm_code(raw_code)
        debug_info["llm_generated_code"] = code

        exec_locals = {"pd": pd, "recommended_df": recommended_df}

        try:
            exec(code, {}, exec_locals)
            df_filtered = exec_locals.get("df_filtered")
        
            if df_filtered is None or len(df_filtered) == 0:
                # Fall back: run same filter on the full dataframe
                debug_info["llm_filter_result"] = "vectorstore results empty — falling back to full CSV"
                exec_locals_fallback = {"pd": pd, "recommended_df": df}  # <- swap in full df
                exec(code, {}, exec_locals_fallback)
                df_filtered = exec_locals_fallback.get("df_filtered")
        
                if df_filtered is None or len(df_filtered) == 0:
                    debug_info["llm_filter_result"] += " — full CSV also empty, returning full CSV"
                    df_filtered = df
                else:
                    debug_info["llm_filter_result"] += f" — full CSV returned {len(df_filtered)} rows"
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

