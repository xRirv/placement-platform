import pika
from app.mq.client import get_channel  # cite: 1

def push_exp_id(experience_id: str) -> bool:
    """Pushes only the raw experience_id string into RabbitMQ."""
    try:
        connection, channel = get_channel()
        
        # Publish the plain string variable directly (no json.dumps)
        channel.basic_publish(
            exchange='',
            routing_key='exp_queue',
            body=experience_id.encode('utf-8')
        )
        
        connection.close()
        print(f"[+] Pushed raw exp_id to queue: {experience_id}")
        return True
    except Exception as e:
        print(f"[-] Error pushing to queue: {e}")
        return False