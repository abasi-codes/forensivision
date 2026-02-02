import logging
from typing import Any, Optional

import asyncpg

from src.config import settings

logger = logging.getLogger(__name__)


class Database:
    """Async PostgreSQL database client."""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        """Create connection pool."""
        self.pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=2,
            max_size=10,
        )
        logger.info("Database connection pool created")

    async def disconnect(self):
        """Close connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    async def execute(self, query: str, *args) -> str:
        """Execute a query."""
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args) -> list:
        """Fetch all rows."""
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        """Fetch a single row."""
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args) -> Any:
        """Fetch a single value."""
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)
