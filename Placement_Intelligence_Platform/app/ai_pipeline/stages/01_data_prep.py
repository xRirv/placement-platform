import re


def process(payload: dict) -> dict:
    text = re.sub(r"\s+", " ", payload["raw_text"]).strip()
    return {**payload, "clean_text": text}
