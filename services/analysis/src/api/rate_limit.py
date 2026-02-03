"""IP-based rate limiting for demo endpoints."""

import logging
from typing import Optional

from fastapi import HTTPException, Request, status

from src.core.redis import get_redis

logger = logging.getLogger(__name__)

# Demo rate limits
DEMO_RATE_LIMIT = 3  # requests per window
DEMO_RATE_WINDOW = 3600  # 1 hour in seconds


async def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies."""
    # Check for forwarded header (behind proxy/load balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP (original client)
        return forwarded.split(",")[0].strip()

    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client
    if request.client:
        return request.client.host

    return "unknown"


async def check_demo_rate_limit(client_ip: str) -> None:
    """
    Check if the client IP has exceeded the demo rate limit.

    Raises HTTPException 429 if rate limit is exceeded.
    """
    redis = await get_redis()
    key = f"rate_limit:demo:video:{client_ip}"

    # Get current count
    current = await redis.get(key)

    if current is not None:
        count = int(current)
        if count >= DEMO_RATE_LIMIT:
            # Get TTL for retry-after header
            ttl = await redis.ttl(key)
            minutes_remaining = max(1, (ttl + 59) // 60)  # Round up to nearest minute

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Demo limit reached. Try again in {minutes_remaining} minutes",
                    "retry_after_seconds": ttl,
                },
                headers={"Retry-After": str(ttl)},
            )

    # Increment counter with expiry
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, DEMO_RATE_WINDOW)
    await pipe.execute()

    logger.info(f"Demo rate limit check passed for {client_ip}")


async def get_demo_rate_limit_remaining(client_ip: str) -> int:
    """Get the number of demo requests remaining for an IP."""
    redis = await get_redis()
    key = f"rate_limit:demo:video:{client_ip}"

    current = await redis.get(key)
    if current is None:
        return DEMO_RATE_LIMIT

    return max(0, DEMO_RATE_LIMIT - int(current))
