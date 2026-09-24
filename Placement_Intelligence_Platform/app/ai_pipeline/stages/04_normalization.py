def process(payload: dict) -> dict:
    normalized = [question.lower().strip() for question in payload.get("questions", [])]
    return {**payload, "canonical_questions": normalized}
