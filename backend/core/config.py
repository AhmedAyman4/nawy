import os

MONGO_URI = os.environ.get("MONGO_URI")
MONGO_DB_NAME = "nawy-property-recommender-v1"
MONGO_COLLECTION_NAME = "chat_history"
HISTORY_MESSAGES_LIMIT = 5

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

# Exporting as a dictionary for easier access in generic helpers
CONFIG = {
    "MONGO_URI": MONGO_URI,
    "MONGO_DB_NAME": MONGO_DB_NAME,
    "MONGO_COLLECTION_NAME": MONGO_COLLECTION_NAME,
    "HISTORY_MESSAGES_LIMIT": HISTORY_MESSAGES_LIMIT,
    "MONGO_PREFERENCES_COLLECTION": MONGO_PREFERENCES_COLLECTION,
    "PREFERENCE_EXTRACTION_EVERY_N_TURNS": PREFERENCE_EXTRACTION_EVERY_N_TURNS,
    "USER_PREFERENCE_SCHEMA": USER_PREFERENCE_SCHEMA
}
