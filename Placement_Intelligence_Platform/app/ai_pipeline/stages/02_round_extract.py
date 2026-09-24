import re


def process(payload: dict) -> dict:
    match = re.search(r"(?:round|r)\s*(\d+)", payload["clean_text"], re.IGNORECASE)
    return {**payload, "round": int(match.group(1)) if match else None, "round_confidence": 0.8 if match else 0.0}
