import logging
from typing import Optional

import asyncpg

from src.core.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def init_db() -> None:
    """Initialize database connection pool."""
    global _pool
    logger.info("Initializing database connection pool...")

    _pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=5,
        max_size=20,
        command_timeout=60,
    )
    logger.info("Database connection pool initialized")


async def close_db() -> None:
    """Close database connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")


async def get_db() -> asyncpg.Pool:
    """Get database connection pool."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool
