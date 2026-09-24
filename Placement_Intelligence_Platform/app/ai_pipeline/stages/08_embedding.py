def process(payload: dict) -> dict:
    # Embedding generation belongs behind a provider adapter in production.
    return {**payload, "embeddings": []}
