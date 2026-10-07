from __future__ import annotations

import json
import logging
from typing import Any

from app.ai_pipeline import RawExperience, run_pipeline
from app.core.config import settings
from app.db.repositories import SupabaseRepository
from app.mq.client import get_channel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ingestion_worker")


def _parse_experience_id(body: bytes) -> str:
    message = body.decode("utf-8").strip()
    try:
        parsed = json.loads(message)
    except json.JSONDecodeError:
        return message
    if isinstance(parsed, dict) and isinstance(parsed.get("experience_id"), str):
        return parsed["experience_id"]
    raise ValueError("message must contain an experience_id")


def _combined_text(row: dict[str, Any]) -> str:
    questions = row.get("questions")
    if isinstance(questions, list):
        rendered_questions = []
        for question in questions:
            if isinstance(question, dict):
                rendered_questions.append(question.get("question_text") or question.get("question") or str(question))
            else:
                rendered_questions.append(str(question))
        questions = "\n".join(f"- {question}" for question in rendered_questions)
    sections = []
    for label, value in (
        ("EXPERIENCE", row.get("raw_content")),
        ("QUESTIONS SUMMARY", row.get("questions_summary")),
        ("TIPS", row.get("tips")),
        ("QUESTIONS", questions),
    ):
        if value is None or value == "":
            continue
        rendered = json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value)
        sections.append(f"{label}:\n{rendered}")
    return "\n\n".join(sections)


def process_message(ch, method, properties, body):
    experience_id = _parse_experience_id(body)
    repository = SupabaseRepository()
    logger.info("[WORKER] received experience_id=%s", experience_id)
    try:
        repository.update_raw_status(experience_id, "PROCESSING", stage="AI_PIPELINE", error=None)
        row = repository.fetch_raw_experience(experience_id)
        raw = RawExperience(
            experience_id=experience_id,
            text=_combined_text(row),
            company_hint=row.get("company_name"),
            role_hint=row.get("role_title"),
            interview_date=row.get("interview_date"),
        )
        logger.info("[DB] fetched experience_id=%s", experience_id)
        payload = run_pipeline(raw, repository=repository)
        if settings.dry_run:
            logger.info("[PIPELINE] dry run payload experience_id=%s: %s", experience_id, payload.model_dump_json())
        else:
            logger.info("[DB] applying persistence payload experience_id=%s", experience_id)
            repository.apply_payload(payload)
            repository.update_raw_status(experience_id, "COMPLETED", stage="PERSISTENCE", error=None)
            logger.info("[DB] persistence successful experience_id=%s", experience_id)
        ch.basic_ack(delivery_tag=method.delivery_tag)
        logger.info("[WORKER] ACK experience_id=%s", experience_id)
    except Exception as err:
        logger.exception("[WORKER] failed experience_id=%s: %s", experience_id, err)
        try:
            repository.update_raw_status(experience_id, "FAILED", stage="AI_PIPELINE", error=str(err)[:1000])
        finally:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def main() -> None:
    connection, channel = get_channel()
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=settings.amqp_queue, on_message_callback=process_message)
    logger.info("[WORKER] listening queue=%s", settings.amqp_queue)
    try:
        channel.start_consuming()
    finally:
        connection.close()


if __name__ == "__main__":
    main()