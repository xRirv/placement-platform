import pika
import os
from dotenv import load_dotenv

load_dotenv()

AMQP_URL = os.getenv("AMQP_URL")

# CloudAMQP URL
def get_channel():
    parameters = pika.URLParameters(AMQP_URL)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    
    # Declare the queue so it exists before publishing or consuming
    channel.queue_declare(queue='exp_queue')
    return connection, channel