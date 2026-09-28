"""Orchestration only: prepare -> extract -> normalize -> resolve -> classify -> persist.

All processing logic lives in the stages. Stage functions raise PipelineError
(with stage, experience_id, operation, reason); the runner logs and re-raises it.
"""
from __future__ import annotations

from typing import Optional

from . import PipelineError, log_event
from .stages import build_persistence_payload, classify, extract, normalize, prepare, resolve
from .stages.classify import QuestionClassifier
from .stages.persist import PersistencePayload
from .stages.prepare import RawExperience
from .stages.resolve import EntityRepository, LLMResolver


def run_pipeline(
    raw: RawExperience,
    repository: EntityRepository,
    *,
    classifier: Optional[QuestionClassifier] = None,
    llm_resolver: Optional[LLMResolver] = None,
) -> PersistencePayload:
    """Process one raw experience into a PersistencePayload. Never writes to a database."""
    log_event("pipeline_started", experience_id=raw.experience_id)
    try:
        prepared = prepare(raw)
        extracted = extract(prepared)
        normalized = normalize(extracted)
        resolved = resolve(normalized, repository, llm_resolver)
        classified = classify(resolved, classifier)
        payload = build_persistence_payload(classified)
    except PipelineError as err:
        log_event("pipeline_failed", experience_id=raw.experience_id, stage=err.stage, operation=err.operation, reason=err.reason)
        raise
    log_event("pipeline_completed", experience_id=raw.experience_id, **payload.metadata.counts)
    return payload