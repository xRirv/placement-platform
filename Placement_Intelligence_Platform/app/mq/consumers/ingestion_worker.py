import time
from app.mq.client import get_channel  # cite: 1
from app.db.repositories import JobRepository  # cite: 3

def process_message(ch, method, properties, body):
    # Decode raw byte string to plain string variable
    experience_id = body.decode('utf-8')
    print(f"[*] Worker picked up experience_id: {experience_id}")

    try:
        JobRepository.update_job_status(experience_id, "PROCESSING", stage="INGESTION")
        # Perform your processing/AI tasks using experience_id...
        time.sleep(2)
        JobRepository.update_job_status(experience_id, "COMPLETED", stage="EMBEDDING")
        print(f"[v] Completed experience_id: {experience_id}")

    except Exception as err:
        JobRepository.update_job_status(
            experience_id,
            "FAILED",
            stage="INGESTION",
            error=str(err),
        )
        print(f"[!] Processing failed for experience_id {experience_id}: {err}")

    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)