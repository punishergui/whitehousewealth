from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.household import Household, HouseholdMember
from app.models.sync import FireflyConfig

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    avatar_url: str | None = Field(default=None, max_length=500)


class HouseholdUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    currency: str | None = Field(default=None, max_length=3)
    timezone: str | None = Field(default=None, max_length=60)


class FireflyConfigCreate(BaseModel):
    base_url: str = Field(max_length=500)
    pat_token: str
    sync_accounts: bool = True
    sync_transactions: bool = True
    sync_budgets: bool = True
    sync_bills: bool = True
    lookback_days: int = 90


class FireflyConfigUpdate(BaseModel):
    base_url: str | None = Field(default=None, max_length=500)
    pat_token: str | None = None
    is_active: bool | None = None
    sync_accounts: bool | None = None
    sync_transactions: bool | None = None
    sync_budgets: bool | None = None
    sync_bills: bool | None = None
    lookback_days: int | None = None


# ── Profile ────────────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the current user's profile and household memberships."""
    result = await db.execute(
        select(HouseholdMember)
        .where(HouseholdMember.user_id == current_user.id)
        .options(selectinload(HouseholdMember.household))
    )
    memberships = result.scalars().all()

    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "full_name": current_user.full_name,
            "phone": current_user.phone,
            "avatar_url": current_user.avatar_url,
            "is_active": current_user.is_active,
            "is_superuser": current_user.is_superuser,
        },
        "households": [
            {
                "id": str(m.household.id),
                "name": m.household.name,
                "slug": m.household.slug,
                "currency": m.household.currency,
                "timezone": m.household.timezone,
                "role": m.role,
                "is_primary": m.is_primary,
            }
            for m in memberships
        ],
    }


@router.patch("/profile")
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update the current user's profile fields."""
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.flush()
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "avatar_url": current_user.avatar_url,
    }


# ── Household ──────────────────────────────────────────────────────────────────

@router.get("/household")
async def get_household(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the current household settings."""
    result = await db.execute(
        select(HouseholdMember)
        .where(HouseholdMember.household_id == household.id)
        .options(selectinload(HouseholdMember.user))
    )
    members = result.scalars().all()

    return {
        "id": str(household.id),
        "name": household.name,
        "slug": household.slug,
        "currency": household.currency,
        "timezone": household.timezone,
        "fiscal_year_start_month": household.fiscal_year_start_month,
        "members": [
            {
                "user_id": str(m.user_id),
                "full_name": m.user.full_name,
                "email": m.user.email,
                "role": m.role,
                "display_name": m.display_name,
                "is_primary": m.is_primary,
            }
            for m in members
        ],
    }


@router.patch("/household")
async def update_household(
    body: HouseholdUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update household settings."""
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(household, field, value)
    await db.flush()
    return {
        "id": str(household.id),
        "name": household.name,
        "slug": household.slug,
        "currency": household.currency,
        "timezone": household.timezone,
    }


# ── Firefly III Config ─────────────────────────────────────────────────────────

@router.get("/firefly")
async def get_firefly_config(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the Firefly III integration config (token masked)."""
    result = await db.execute(
        select(FireflyConfig).where(FireflyConfig.household_id == household.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        return {"connected": False, "config": None}

    return {
        "connected": config.is_active,
        "config": {
            "id": str(config.id),
            "base_url": config.base_url,
            "pat_token": "***" + config.pat_token[-4:] if len(config.pat_token) > 4 else "****",
            "is_active": config.is_active,
            "last_successful_sync": config.last_successful_sync.isoformat() if config.last_successful_sync else None,
            "sync_accounts": config.sync_accounts,
            "sync_transactions": config.sync_transactions,
            "sync_budgets": config.sync_budgets,
            "sync_bills": config.sync_bills,
            "lookback_days": config.lookback_days,
        },
    }


@router.post("/firefly", status_code=status.HTTP_201_CREATED)
async def create_firefly_config(
    body: FireflyConfigCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create or replace the Firefly III integration config."""
    # Check if one already exists
    result = await db.execute(
        select(FireflyConfig).where(FireflyConfig.household_id == household.id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Firefly config already exists. Use PATCH to update.",
        )

    config = FireflyConfig(
        household_id=household.id,
        base_url=body.base_url,
        pat_token=body.pat_token,
        sync_accounts=body.sync_accounts,
        sync_transactions=body.sync_transactions,
        sync_budgets=body.sync_budgets,
        sync_bills=body.sync_bills,
        lookback_days=body.lookback_days,
    )
    db.add(config)
    await db.flush()
    return {"id": str(config.id), "connected": True, "base_url": config.base_url}


@router.patch("/firefly")
async def update_firefly_config(
    body: FireflyConfigUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update the Firefly III integration config."""
    result = await db.execute(
        select(FireflyConfig).where(FireflyConfig.household_id == household.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        raise HTTPException(status_code=404, detail="Firefly config not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(config, field, value)
    await db.flush()
    return {"id": str(config.id), "connected": config.is_active, "base_url": config.base_url}


@router.delete("/firefly", status_code=status.HTTP_204_NO_CONTENT)
async def delete_firefly_config(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove the Firefly III integration config."""
    result = await db.execute(
        select(FireflyConfig).where(FireflyConfig.household_id == household.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Firefly config not found")
    await db.delete(config)
