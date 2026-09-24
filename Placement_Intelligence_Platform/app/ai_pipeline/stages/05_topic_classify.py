def process(payload: dict) -> dict:
    topics = []
    for question in payload.get("canonical_questions", []):
        topic = "data_structures" if any(word in question for word in ("array", "tree", "graph")) else "general"
        topics.append({"question": question, "primary": topic, "secondary": None})
    return {**payload, "topics": topics}
