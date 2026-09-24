from importlib import import_module
from typing import Any

STAGE_MODULES = (
    "01_data_prep",
    "02_round_extract",
    "03_question_extract",
    "04_normalization",
    "05_topic_classify",
    "06_difficulty",
    "07_similarity",
    "08_embedding",
)


def run_pipeline(raw_text: str) -> dict[str, Any]:
    payload: dict[str, Any] = {"raw_text": raw_text}
    for module_name in STAGE_MODULES:
        module = import_module(f"app.ai_pipeline.stages.{module_name}")
        payload = module.process(payload)
    return payload
