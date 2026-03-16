from fastapi import APIRouter, HTTPException, Request
from ..schemas.chat import ChatRequest
from ..utils.dependencies import client

router = APIRouter()

@router.post("/location")
async def chat_about_location(request: Request, payload: ChatRequest):
    """
    RAG-based chat endpoint for answering questions about location information.
    Uses the location_information_db ChromaDB vectorstore.
    """
    try:
        llm = request.app.state.llm
        location_vectorstore = request.app.state.location_vectorstore

        if not payload.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        retriever = location_vectorstore.as_retriever(search_kwargs={"k": 10})
        location_prompt = client.pull_prompt("property_location_prompt")

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        retrieved_docs = retriever.invoke(payload.question)
        context = format_docs(retrieved_docs)

        chain = location_prompt | llm

        response = chain.invoke({
            "context": context,
            "question": payload.question
        })

        return {
            "question": payload.question,
            "answer": response.content.strip()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
