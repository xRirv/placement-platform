def process(payload: dict) -> dict:
    questions = [part.strip() for part in payload["clean_text"].split("?") if part.strip()]
    return {**payload, "questions": [f"{question}?" for question in questions]}
