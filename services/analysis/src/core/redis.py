import logging
from typing import Optional

import redis.asyncio as redis

from src.core.config import settings

logger = logging.getLogger(__name__)

_redis: Optional[redis.Redis] = None


async def init_redis() -> None:
    """Initialize Redis connection."""
    global _redis
    logger.info("Initializing Redis connection...")

    _redis = redis.from_url(settings.redis_url, decode_responses=True)
    await _redis.ping()
    logger.info("Redis connection initialized")


async def close_redis() -> None:
    """Close Redis connection."""
    global _redis
    if _redis:
        await _redis.close()
        _redis = None
        logger.info("Redis connection closed")


async def get_redis() -> redis.Redis:
    """Get Redis connection."""
    if _redis is None:
        raise RuntimeError("Redis not initialized")
    return _redis
