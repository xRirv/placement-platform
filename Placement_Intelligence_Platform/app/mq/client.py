import pika
from dotenv import load_dotenv

load_dotenv()

AMQP_URL = 'amqps://azrlltxi:***REMOVED***@warthog.lmq.cloudamqp.com/azrlltxi'

# CloudAMQP URL
def get_channel():
    parameters = pika.URLParameters(AMQP_URL)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    
    # Declare the queue so it exists before publishing or consuming
    channel.queue_declare(queue='exp_queue')
    return connection, channel