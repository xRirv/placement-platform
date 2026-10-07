import pika

from app.core.config import settings


# Open a fresh RabbitMQ connection and channel with the work queue declared
def get_channel():
    # Parse the AMQP URL into connection parameters
    parameters = pika.URLParameters(settings.amqp_url)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # Ensure the queue exists before any publish or consume
    channel.queue_declare(queue=settings.amqp_queue)
    return connection, channel
