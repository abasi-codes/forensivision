from typing import Optional
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, Header, status
from pydantic import BaseModel

from src.core.config import settings


class UserContext(BaseModel):
    """Context for the authenticated user."""

    user_id: UUID
    email: str
    tier: str
    organization_id: Optional[UUID] = None
    scopes: list[str] = []


async def get_current_user(
    authorization: str = Header(..., description="Bearer token or API key"),
) -> UserContext:
    """
    Validate authorization header and return user context.

    This calls the auth service to validate the token/API key.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "MISSING_AUTH", "message": "Authorization header required"},
        )

    # Extract token from Bearer scheme
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_AUTH", "message": "Invalid authorization format"},
        )

    token = parts[1]

    # Check if it's an API key or JWT
    if token.startswith("fv_"):
        # API key validation
        return await _validate_api_key(token)
    else:
        # JWT validation
        return await _validate_jwt(token)


async def _validate_jwt(token: str) -> UserContext:
    """Validate JWT token with auth service."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.auth_service_url}/v1/internal/validate",
                json={"token": token},
                timeout=5.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token"},
                )

            data = response.json()
            claims = data.get("claims", {})

            return UserContext(
                user_id=UUID(claims["sub"]),
                email=claims.get("email", ""),
                tier=claims.get("tier", "free"),
                organization_id=UUID(claims["org_id"]) if claims.get("org_id") else None,
                scopes=claims.get("scope", "").split() if claims.get("scope") else [],
            )

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AUTH_UNAVAILABLE", "message": "Authentication service unavailable"},
        )


async def _validate_api_key(key: str) -> UserContext:
    """Validate API key with auth service."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.auth_service_url}/v1/internal/validate-api-key",
                json={"key": key},
                timeout=5.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={"code": "INVALID_API_KEY", "message": "Invalid API key"},
                )

            data = response.json()
            api_key = data.get("api_key", {})
            user = data.get("user", {})

            return UserContext(
                user_id=UUID(user["id"]),
                email=user.get("email", ""),
                tier=user.get("tier", "free"),
                organization_id=UUID(user["organization_id"]) if user.get("organization_id") else None,
                scopes=api_key.get("scopes", []),
            )

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "AUTH_UNAVAILABLE", "message": "Authentication service unavailable"},
        )


def require_scope(required_scope: str):
    """Dependency to require a specific scope."""

    async def _check_scope(user: UserContext = Depends(get_current_user)) -> UserContext:
        if required_scope not in user.scopes and "admin:*" not in user.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "INSUFFICIENT_SCOPE",
                    "message": f"Required scope: {required_scope}",
                },
            )
        return user

    return _check_scope
