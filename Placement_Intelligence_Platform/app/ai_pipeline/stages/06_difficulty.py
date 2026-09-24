def process(payload: dict) -> dict:
    enriched = []
    for item in payload.get("topics", []):
        question = item["question"]
        difficulty = "HARD" if len(question) > 140 else "MEDIUM" if len(question) > 70 else "EASY"
        enriched.append({**item, "difficulty": difficulty})
    return {**payload, "topics": enriched}
