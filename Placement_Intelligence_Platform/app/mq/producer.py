from app.mq.client import publish_message


def enqueue_ingestion(job_id: str) -> None:
    publish_message({"job_id": job_id})
