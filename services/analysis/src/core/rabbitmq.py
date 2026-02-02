import logging
from typing import Optional

import aio_pika
from aio_pika import Channel, Connection, ExchangeType

from src.core.config import settings

logger = logging.getLogger(__name__)

_connection: Optional[Connection] = None
_channel: Optional[Channel] = None


async def init_rabbitmq() -> None:
    """Initialize RabbitMQ connection and declare queues."""
    global _connection, _channel
    logger.info("Initializing RabbitMQ connection...")

    _connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    _channel = await _connection.channel()

    # Declare dead letter exchange
    dlx = await _channel.declare_exchange("dlx.analysis", ExchangeType.DIRECT, durable=True)

    # Declare dead letter queues
    for queue_name in [
        settings.queue_image_analysis,
        settings.queue_video_analysis,
        settings.queue_audio_analysis,
        settings.queue_batch_analysis,
    ]:
        dlq_name = f"dlq.{queue_name}"
        dlq = await _channel.declare_queue(dlq_name, durable=True)
        await dlq.bind(dlx, routing_key=queue_name)

    # Declare main queues with dead letter configuration
    for queue_name in [
        settings.queue_image_analysis,
        settings.queue_video_analysis,
        settings.queue_audio_analysis,
        settings.queue_batch_analysis,
    ]:
        await _channel.declare_queue(
            queue_name,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "dlx.analysis",
                "x-dead-letter-routing-key": queue_name,
                "x-message-ttl": 3600000,  # 1 hour
                "x-max-priority": 10,
            },
        )

    logger.info("RabbitMQ connection initialized and queues declared")


async def close_rabbitmq() -> None:
    """Close RabbitMQ connection."""
    global _connection, _channel
    if _channel:
        await _channel.close()
        _channel = None
    if _connection:
        await _connection.close()
        _connection = None
        logger.info("RabbitMQ connection closed")


async def get_channel() -> Channel:
    """Get RabbitMQ channel."""
    if _channel is None:
        raise RuntimeError("RabbitMQ not initialized")
    return _channel


async def publish_message(queue_name: str, message: bytes, priority: int = 5) -> None:
    """Publish a message to a queue."""
    channel = await get_channel()
    await channel.default_exchange.publish(
        aio_pika.Message(
            body=message,
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            priority=priority,
        ),
        routing_key=queue_name,
    )
