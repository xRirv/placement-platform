from app.core.config import settings
from app.mq.client import get_channel


# Publish a single experience_id to the RabbitMQ queue for async processing
def publish_experience_id(experience_id: str) -> bool:
    try:
        connection, channel = get_channel()

        # Send the plain string (not JSON) — the worker decodes it on receipt
        channel.basic_publish(
            exchange="",
            routing_key=settings.amqp_queue,
            body=experience_id.encode("utf-8"),
        )

        # Close immediately — each publish opens a short-lived connection
        connection.close()
        return True
    except Exception as e:
        print(f"[producer] Failed to publish experience_id={experience_id}: {e}")
        return False
