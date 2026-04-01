import re
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pymongo import MongoClient
from langchain_core.messages import HumanMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_mongodb.chat_message_histories import MongoDBChatMessageHistory
from langsmith import Client

client = Client()

def clean_llm_code(raw_code: str) -> str:
    cleaned = re.sub(r"^```python\n", "", raw_code, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\n", "", cleaned)
    cleaned = re.sub(r"```$", "", cleaned)
    return cleaned.strip()

def _get_preferences_collection(mongo_client: MongoClient, db_name: str, collection_name: str):
    db = mongo_client[db_name]
    return db[collection_name]

def _load_preference_doc(session_id: str, mongo_client: MongoClient, db_name: str, collection_name: str, schema: Dict[str, Any]) -> dict:
    col = _get_preferences_collection(mongo_client, db_name, collection_name)
    doc = col.find_one({"user_id": session_id})
    if doc is None:
        doc = dict(schema)
        doc["user_id"] = session_id
    return doc

def _save_preference_doc(doc: dict, mongo_client: MongoClient, db_name: str, collection_name: str) -> None:
    col = _get_preferences_collection(mongo_client, db_name, collection_name)
    col.update_one(
        {"user_id": doc["user_id"]},
        {"$set": doc},
        upsert=True
    )

def _extract_preferences_from_history(new_user_messages: List[str], existing_profile: dict, llm) -> dict:
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

def maybe_update_preferences(session_id: str, all_messages, llm, mongo_client: MongoClient, config: Dict[str, Any]) -> None:
    try:
        db_name = config["MONGO_DB_NAME"]
        collection_name = config["MONGO_PREFERENCES_COLLECTION"]
        schema = config["USER_PREFERENCE_SCHEMA"]
        extraction_limit = config["PREFERENCE_EXTRACTION_EVERY_N_TURNS"]

        doc = _load_preference_doc(session_id, mongo_client, db_name, collection_name, schema)
        doc["turn_counter"] = doc.get("turn_counter", 0) + 1

        if doc["turn_counter"] % extraction_limit == 0:
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

        _save_preference_doc(doc, mongo_client, db_name, collection_name)

    except Exception as e:
        print(f"[preferences] Non-fatal error for session {session_id}: {e}")

# --- MongoDB Fallback Helpers ---

def get_history(session_id: str, app_state, config: Dict[str, Any]) -> Any:
    """
    Returns a chat history object for the given session.
    Tries MongoDBChatMessageHistory first. If Mongo is unavailable (or fails),
    flips app_state.mongo_available to False permanently and returns an
    in-memory ChatMessageHistory stored in app_state.local_chat_histories.
    """
    if app_state.mongo_available:
        try:
            history = MongoDBChatMessageHistory(
                connection_string=config["MONGO_URI"],
                database_name=config["MONGO_DB_NAME"],
                collection_name=config["MONGO_COLLECTION_NAME"],
                session_id=session_id,
            )
            # Trigger an actual read to catch connection errors early
            _ = history.messages
            return history
        except Exception as e:
            print(f"[mongo] Connection failed, switching to local fallback permanently: {e}")
            app_state.mongo_available = False

    # Local in-memory fallback
    if session_id not in app_state.local_chat_histories:
        app_state.local_chat_histories[session_id] = ChatMessageHistory()
    return app_state.local_chat_histories[session_id]

def safe_load_preference_doc(session_id: str, app_state, config: Dict[str, Any]) -> dict:
    """
    Loads user preference doc. Falls back to app_state.local_preferences on Mongo error.
    """
    if app_state.mongo_available and app_state.mongo_client is not None:
        try:
            return _load_preference_doc(
                session_id, 
                app_state.mongo_client, 
                config["MONGO_DB_NAME"], 
                config["MONGO_PREFERENCES_COLLECTION"], 
                config["USER_PREFERENCE_SCHEMA"]
            )
        except Exception as e:
            print(f"[mongo] Failed to load preferences, switching to local fallback: {e}")
            app_state.mongo_available = False

    if session_id not in app_state.local_preferences:
        doc = dict(config["USER_PREFERENCE_SCHEMA"])
        doc["user_id"] = session_id
        app_state.local_preferences[session_id] = doc
    return app_state.local_preferences[session_id]

def safe_save_preference_doc(doc: dict, app_state, config: Dict[str, Any]) -> None:
    """
    Saves user preference doc. Falls back to app_state.local_preferences on Mongo error.
    """
    if app_state.mongo_available and app_state.mongo_client is not None:
        try:
            _save_preference_doc(
                doc, 
                app_state.mongo_client, 
                config["MONGO_DB_NAME"], 
                config["MONGO_PREFERENCES_COLLECTION"]
            )
            return
        except Exception as e:
            print(f"[mongo] Failed to save preferences, switching to local fallback: {e}")
            app_state.mongo_available = False

    app_state.local_preferences[doc["user_id"]] = doc

def maybe_update_preferences_safe(session_id: str, all_messages, llm, app_state, config: Dict[str, Any]) -> None:
    """
    Drop-in replacement for maybe_update_preferences that uses the safe load/save helpers.
    """
    try:
        doc = safe_load_preference_doc(session_id, app_state, config)
        doc["turn_counter"] = doc.get("turn_counter", 0) + 1

        if doc["turn_counter"] % config["PREFERENCE_EXTRACTION_EVERY_N_TURNS"] == 0:
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

        safe_save_preference_doc(doc, app_state, config)

    except Exception as e:
        print(f"[preferences] Non-fatal error for session {session_id}: {e}")

def _is_property_search(question: str, llm) -> bool:
    """
    Returns True if the user's question is asking to find/search for a property.
    """
    try:
        _is_property_search_prompt = client.pull_prompt("is_property_search_prompt")
        if _is_property_search_prompt is None:
            return False  # safe fallback
        response = (_is_property_search_prompt | llm).invoke({"question": question})
        raw = response.content.strip()
        raw = re.sub(r"^```json\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"^```\s*", "", raw)
        raw = re.sub(r"```$", "", raw)
        parsed = json.loads(raw.strip())
        return bool(parsed.get("is_property_search", False))
    except (json.JSONDecodeError, AttributeError, Exception) as e:
        print(f"[is_property_search] Failed, defaulting to False: {e}")
        return False  # never crash the chat endpoint over this

