from fastapi import APIRouter, HTTPException, Request
from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langsmith import Client

from ..schemas.models import ChatRequest, ChatResponse, QueryRequest
from ..utils.helpers import (
    _is_property_search, 
    maybe_update_preferences_safe, 
    safe_load_preference_doc,
    get_history
)
from ..core.config import (
    MONGO_DB_NAME, 
    HISTORY_MESSAGES_LIMIT, 
    CONFIG
)
from .properties import get_recommendations

router = APIRouter()
client = Client()

@router.post("/chat", response_model=ChatResponse)
async def chat_about_location(request: Request, payload: ChatRequest):
    try:
        llm = request.app.state.llm
        smart_llm = request.app.state.smart_llm
        vectorstore = request.app.state.locations_and_compounds_vectorstore

        if not payload.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        session_id = payload.session_id

        # Use safe history helper — falls back to in-memory if Mongo is unavailable
        chat_history = get_history(session_id, request.app.state, CONFIG)

        history_messages = chat_history.messages[-HISTORY_MESSAGES_LIMIT:]

        # Detect property search intent before RAG flow
        if _is_property_search(payload.question, smart_llm):
            recommend_payload = QueryRequest(query=payload.question, top_k=150, page=1, size=150)
            recommend_result = await get_recommendations(request, recommend_payload)
            properties = recommend_result.get("data", [])

            count = len(properties)
            answer = f"I found {count} properties matching your request. Here are the top results for you!" if count > 0 else "I couldn't find any properties matching your criteria. Try adjusting your filters."

            chat_history.add_user_message(payload.question)
            chat_history.add_ai_message(answer)

            maybe_update_preferences_safe(
                session_id=session_id,
                all_messages=chat_history.messages,
                llm=smart_llm,
                app_state=request.app.state,
                config=CONFIG
            )

            return {
                "question": payload.question,
                "answer": answer,
                "session_id": session_id,
                "history_length": len(chat_history.messages) // 2,
                "properties": properties,
            }

        if history_messages:
            rewrite_prompt = client.pull_prompt("chat_history_rewrite_prompt")
            retriever_query = (rewrite_prompt | llm | StrOutputParser()).invoke({
                "chat_history": history_messages,
                "question": payload.question
            })
        else:
            retriever_query = payload.question

        retrieved_docs = vectorstore.as_retriever(search_kwargs={"k": 10}).invoke(retriever_query)
        context = "\n\n".join(doc.page_content for doc in retrieved_docs)
        location_prompt = client.pull_prompt("property_location_prompt")
        response = (location_prompt | llm).invoke({
            "context": context,
            "chat_history": history_messages,
            "question": payload.question
        })

        answer = response.content.strip()

        chat_history.add_user_message(payload.question)
        chat_history.add_ai_message(answer)

        maybe_update_preferences_safe(
            session_id=session_id,
            all_messages=chat_history.messages,
            llm=smart_llm,
            app_state=request.app.state,
            config=CONFIG
        )

        return {
            "question": payload.question,
            "answer": answer,
            "session_id": session_id,
            "history_length": len(chat_history.messages) // 2
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/{session_id}/preferences")
async def get_user_preferences(session_id: str, request: Request):
    doc = safe_load_preference_doc(
        session_id, 
        request.app.state, 
        CONFIG
    )
    doc.pop("_id", None)
    return doc

@router.delete("/chat/{session_id}")
async def clear_chat_history(session_id: str, request: Request):
    chat_history = get_history(session_id, request.app.state, CONFIG)
    chat_history.clear()
    return {"message": f"History cleared for session '{session_id}'"}

@router.get("/chat/{session_id}/history")
async def get_chat_history(session_id: str, request: Request):
    chat_history = get_history(session_id, request.app.state, CONFIG)
    history = chat_history.messages
    formatted = [
        {"role": "human" if isinstance(msg, HumanMessage) else "assistant", "content": msg.content}
        for msg in history
    ]
    return {
        "session_id": session_id,
        "history": formatted,
        "turns": len(formatted) // 2
    }

