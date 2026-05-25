from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import service as auth_service
from app.auth.models import User
from app.database import get_db
from app.models.household import Household, HouseholdMember
from sqlalchemy import select
from sqlalchemy.orm import selectinload

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the JWT bearer token; return the User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth_service.decode_access_token(credentials.credentials)
        user_id_str: str = payload.get("sub", "")
        if not user_id_str:
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user = await auth_service.get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superuser access required")
    return current_user


async def get_current_household(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Household:
    """Return the primary household for the current user."""
    result = await db.execute(
        select(HouseholdMember)
        .where(HouseholdMember.user_id == current_user.id)
        .options(selectinload(HouseholdMember.household))
        .order_by(HouseholdMember.is_primary.desc())
        .limit(1)
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No household found for this user",
        )
    return membership.household


class RequirePermission:
    """Dependency factory that checks a specific permission."""

    def __init__(self, permission: str) -> None:
        self.permission = permission

    async def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if not current_user.has_permission(self.permission) and not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {self.permission}",
            )
        return current_user
