import pika

from app.core.config import settings


def publish_message(message: dict) -> None:
    connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
    try:
        channel = connection.channel()
        channel.queue_declare(queue=settings.rabbitmq_queue, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=settings.rabbitmq_queue,
            body=__import__("json").dumps(message).encode(),
            properties=pika.BasicProperties(delivery_mode=2),
        )
    finally:
        connection.close()
