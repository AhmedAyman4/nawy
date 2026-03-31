import pandas as pd
from fastapi import APIRouter, HTTPException, Request
from langchain_core.runnables import RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langsmith import Client

from ..schemas.models import CompareRequest

router = APIRouter()
client = Client()

@router.post("/compare")
async def compare_properties(request: Request, payload: CompareRequest):
    try:
        df = request.app.state.df
        vectorstore = request.app.state.locations_and_compounds_vectorstore
        llm = request.app.state.llm

        def get_properties_context(id1, id2, dataframe=df):
            ids = [str(id1), str(id2)]
            selected_properties = dataframe[dataframe['id'].isin(ids)]
            context_parts = []
            for _, row in selected_properties.iterrows():
                prop_text = (
                    f"Location: {row['location']}\n"
                    f"Property Name: {row['property_name']}\n"
                    f"Description: {row['description']}\n"
                    f"Area: {row['m2']} m2\n"
                    f"Beds: {row['Beds']}\n"
                    f"Baths: {row['Baths']}\n"
                    f"Payment Plan: {row['payment_plan']}\n"
                    f"Price: {row['price']}"
                )
                context_parts.append(prop_text)
            return "\n\n---\n\n".join(context_parts)

        def property_retriever(inputs):
            return get_properties_context(inputs["id1"], inputs["id2"])

        def location_retriever(inputs):
            ids = [str(inputs["id1"]), str(inputs["id2"])]
            selected = df[df['id'].isin(ids)]
            query_parts = []
            for _, row in selected.iterrows():
                if pd.notna(row.get('location')):
                    query_parts.append(str(row['location']))
                if pd.notna(row.get('description')):
                    query_parts.append(str(row['description']))
            query = " ".join(query_parts) if query_parts else f"locations of properties {inputs['id1']} and {inputs['id2']}"
            return vectorstore.as_retriever(search_kwargs={"k": 7}).invoke(query)

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        multi_context_prompt = client.pull_prompt("compare_multi_context_prompt")

        multi_context_chain = (
            {
                "property_context": RunnableLambda(property_retriever),
                "location_context": (RunnableLambda(location_retriever) | format_docs)
            }
            | multi_context_prompt
            | llm
            | StrOutputParser()
        )

        result = multi_context_chain.invoke({"id1": payload.id1, "id2": payload.id2})

        return {"id1": payload.id1, "id2": payload.id2, "comparison": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
