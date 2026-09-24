def process(payload: dict) -> dict:
    questions = payload.get("canonical_questions", [])
    unique_questions = list(dict.fromkeys(questions))
    return {**payload, "duplicate_count": len(questions) - len(unique_questions), "canonical_questions": unique_questions}
