"""ai_pipeline: turns ONE raw interview-experience paragraph into a PersistencePayload.

Flow: prepare -> extract -> normalize -> resolve -> classify -> persist.
The package never touches a database; it talks to a repository only through the
`EntityRepository` protocol defined in stages/resolve.py, and it hands the future
repository a `PersistencePayload` describing what to write.
"""
from __future__ import annotations

import functools
import json
import logging
import time
from typing import Any, Callable, Optional, TypeVar

PIPELINE_VERSION = "0.1.0"

_logger = logging.getLogger("ai_pipeline")


# ============================================================
# 1. STRUCTURED ERRORS
# ============================================================

class PipelineError(Exception):
    """A stage failure that always says where, for which experience, doing what, and why."""

    def __init__(self, stage: str, experience_id: Optional[str], operation: str, reason: str) -> None:
        self.stage = stage
        self.experience_id = experience_id
        self.operation = operation
        self.reason = reason
        super().__init__(f"[{stage}] experience={experience_id} operation={operation}: {reason}")


# ============================================================
# 2. STRUCTURED LOGGING
# ============================================================

def log_event(event: str, level: int = logging.INFO, **fields: Any) -> None:
    """Emit one JSON log line. Configure handlers/levels in the host application."""
    if _logger.isEnabledFor(level):
        _logger.log(level, json.dumps({"event": event, **fields}, default=str))


# ============================================================
# 3. STAGE GUARD
# ============================================================

F = TypeVar("F", bound=Callable[..., Any])


def stage_guard(stage: str, operation: str) -> Callable[[F], F]:
    """Wrap a public stage function: log start/end and convert any unexpected
    exception into a PipelineError (chained, never swallowed).

    The experience_id is read from the first argument, which every stage input
    model exposes as `.experience_id`.
    """

    def decorator(fn: F) -> F:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            experience_id = getattr(args[0], "experience_id", None) if args else None
            log_event("stage_started", stage=stage, experience_id=experience_id)
            started = time.perf_counter()
            try:
                result = fn(*args, **kwargs)
            except PipelineError:
                raise
            except Exception as exc:
                raise PipelineError(stage, experience_id, operation, f"{type(exc).__name__}: {exc}") from exc
            log_event(
                "stage_completed",
                stage=stage,
                experience_id=experience_id,
                ms=round((time.perf_counter() - started) * 1000, 2),
            )
            return result

        return wrapper  # type: ignore[return-value]

    return decorator


# Imported last: stages import the names above from this package.
from .runner import run_pipeline  # noqa: E402
from .stages.prepare import RawExperience  # noqa: E402

__all__ = ["run_pipeline", "RawExperience", "PipelineError", "PIPELINE_VERSION"]