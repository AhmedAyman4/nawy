import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException, Request
from ..schemas.predict import PricePredictionRequest, PricePredictionResponse

router = APIRouter()

@router.post("", response_model=PricePredictionResponse)
async def predict_price(request: Request, payload: PricePredictionRequest):
    """
    Predicts the price of a property using the trained XGBoost model.
    """
    try:
        if not getattr(request.app.state, "price_model", None) or not getattr(request.app.state, "price_encoder", None):
            raise HTTPException(status_code=53, detail="Price prediction models are currently unavailable.")

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
