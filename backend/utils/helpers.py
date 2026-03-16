import re

def clean_llm_code(raw_code: str) -> str:
    """Helper to remove markdown backticks if the LLM hallucinated them."""
    cleaned = re.sub(r"^```python\n", "", raw_code, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\n", "", cleaned)
    cleaned = re.sub(r"```$", "", cleaned)
    return cleaned.strip()
