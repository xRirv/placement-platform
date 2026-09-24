import json

import pika
from sqlalchemy.orm import Session

from app.ai_pipeline.runner import run_pipeline
from app.core.config import settings
from app.core.database import SessionLocal
from app.db.repositories import get_job, update_job


def process_job(job_id: str, db: Session) -> None:
    job = get_job(db, job_id)
    if job is None:
        return
    update_job(db, job_id, status="processing", error=None)
    try:
        result = run_pipeline(job.raw_text)
        update_job(db, job_id, status="completed", result=result)
    except Exception as exc:
        update_job(db, job_id, status="failed", error=str(exc))
        raise


def start_worker() -> None:
    connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
    channel = connection.channel()
    channel.queue_declare(queue=settings.rabbitmq_queue, durable=True)
    channel.basic_qos(prefetch_count=1)

    def callback(channel, method, properties, body) -> None:
        message = json.loads(body)
        db = SessionLocal()
        try:
            process_job(message["job_id"], db)
            channel.basic_ack(delivery_tag=method.delivery_tag)
        finally:
            db.close()

    channel.basic_consume(queue=settings.rabbitmq_queue, on_message_callback=callback)
    channel.start_consuming()


if __name__ == "__main__":
    start_worker()
