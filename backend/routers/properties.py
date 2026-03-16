import math
import pandas as pd
from fastapi import APIRouter, HTTPException, Request
from ..schemas.properties import PaginatedPropertyResponse, FilterRequest, QueryRequest
from ..utils.helpers import clean_llm_code
from ..utils.dependencies import client

router = APIRouter()

@router.get("/properties", response_model=PaginatedPropertyResponse)
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

@router.get("/filter-options")
async def get_filter_options(request: Request):
    """
    Returns unique values from the dataset to populate UI dropdown menus.
    """
    df = request.app.state.df
    
    locations = df['location'].dropna().unique().tolist() if 'location' in df.columns else []
    property_types = df['property_type'].dropna().unique().tolist() if 'property_type' in df.columns else []
    
    return {
        "locations": sorted(locations),
        "property_types": sorted(property_types)
    }

@router.post("/filter", response_model=PaginatedPropertyResponse)
async def filter_properties(request: Request, payload: FilterRequest):
    """
    Applies hard filters based on the UI bar selections.
    """
    try:
        df = request.app.state.df.copy()

        # 1. Location Filter (Partial Match)
        if payload.location:
            df = df[df['location'].str.contains(payload.location, case=False, na=False)]
        
        # 2. Property Type Filter
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
        llm = request.app.state.llm

        debug_info["query"] = query
        debug_info["dataframe_total_rows"] = len(df)

        if not query.strip():
            return {"data": [], "total": 0, "page": page, "size": size, "total_pages": 0, "debug": {"reason": "Empty query"}}

        # Step 1: Semantic Search
        recommendations = vectorstore.similarity_search(query, k=top_k)
        debug_info["vectorstore_hits"] = len(recommendations)

        # Step 2: ID extraction
        recommendation_ids = []
        for doc in recommendations:
            raw_id = doc.metadata.get('id')
            if raw_id is not None:
                recommendation_ids.append(str(raw_id))

        if not recommendation_ids:
            return {"data": [], "total": 0, "page": page, "size": size, "total_pages": 0, "debug": {**debug_info, "reason": "No IDs extracted"}}

        recommended_df = df[df['id'].isin(recommendation_ids)].copy()

        if recommended_df.empty:
            return {"data": [], "total": 0, "page": page, "size": size, "total_pages": 0, "debug": {**debug_info, "reason": "ID join returned 0 rows"}}

        # Step 3: LLM filter
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
            if df_filtered is None or len(df_filtered) == 0:
                df_filtered = recommended_df
        except Exception as exec_error:
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
