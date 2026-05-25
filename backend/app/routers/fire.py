from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_household
from app.models.fire import RetirementProfile
from app.models.household import Household
from app.services import fire_engine

router = APIRouter(prefix="/fire", tags=["fire"])


class RetirementProfileCreate(BaseModel):
    name: str = Field(default="Primary Profile", max_length=100)
    current_age: int = Field(ge=18, le=100)
    partner_current_age: int | None = None
    retirement_age_target: int = Field(ge=30, le=100)
    life_expectancy: int = Field(default=90, ge=50, le=120)
    current_savings: float = Field(ge=0)
    monthly_contribution: float = Field(ge=0)
    employer_match_pct: float = Field(default=0.0, ge=0, le=1.0)
    expected_return_rate: float = Field(default=0.07, ge=0, le=1.0)
    inflation_rate: float = Field(default=0.03, ge=0, le=0.2)
    target_annual_spending: float = Field(ge=0)
    social_security_estimate: float = Field(default=0.0, ge=0)
    other_income: float = Field(default=0.0, ge=0)
    fire_mode: str = Field(default="regular")
    withdrawal_rate: float = Field(default=0.04, ge=0.01, le=0.1)
    barista_income: float = Field(default=0.0, ge=0)


class RetirementProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    current_age: int | None = Field(default=None, ge=18, le=100)
    retirement_age_target: int | None = Field(default=None, ge=30, le=100)
    current_savings: float | None = Field(default=None, ge=0)
    monthly_contribution: float | None = Field(default=None, ge=0)
    expected_return_rate: float | None = Field(default=None, ge=0, le=1.0)
    inflation_rate: float | None = Field(default=None, ge=0, le=0.2)
    target_annual_spending: float | None = Field(default=None, ge=0)
    social_security_estimate: float | None = Field(default=None, ge=0)
    other_income: float | None = Field(default=None, ge=0)
    fire_mode: str | None = None
    withdrawal_rate: float | None = Field(default=None, ge=0.01, le=0.1)
    barista_income: float | None = Field(default=None, ge=0)


@router.get("/profiles")
async def list_profiles(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(RetirementProfile).where(RetirementProfile.household_id == household.id)
    )
    profiles = result.scalars().all()
    return [_profile_to_dict(p) for p in profiles]


@router.post("/profiles", status_code=status.HTTP_201_CREATED)
async def create_profile(
    body: RetirementProfileCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    profile = RetirementProfile(
        household_id=household.id,
        **{k: Decimal(str(v)) if isinstance(v, float) else v for k, v in body.model_dump().items()},
    )
    db.add(profile)
    await db.flush()
    return _profile_to_dict(profile)


@router.get("/profiles/{profile_id}")
async def get_profile(
    profile_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(RetirementProfile).where(
            RetirementProfile.id == profile_id,
            RetirementProfile.household_id == household.id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _profile_to_dict(profile)


@router.patch("/profiles/{profile_id}")
async def update_profile(
    profile_id: uuid.UUID,
    body: RetirementProfileUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(RetirementProfile).where(
            RetirementProfile.id == profile_id,
            RetirementProfile.household_id == household.id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if isinstance(value, float):
            value = Decimal(str(value))
        setattr(profile, field, value)
    await db.flush()
    return _profile_to_dict(profile)


@router.get("/profiles/{profile_id}/analysis")
async def analyze_profile(
    profile_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Full FIRE analysis with Monte Carlo simulation."""
    result = await db.execute(
        select(RetirementProfile).where(
            RetirementProfile.id == profile_id,
            RetirementProfile.household_id == household.id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return fire_engine.analyze_retirement_profile(profile)


@router.get("/calculate")
async def quick_calculate(
    annual_spending: float = 60000.0,
    current_savings: float = 100000.0,
    monthly_contribution: float = 2000.0,
    return_rate: float = 0.07,
    inflation_rate: float = 0.03,
    withdrawal_rate: float = 0.04,
    mode: str = "regular",
    current_age: int = 35,
    retirement_age: int = 65,
) -> dict:
    """Quick FIRE number calculator without a saved profile."""
    fi_number = fire_engine.calculate_fi_number(annual_spending, withdrawal_rate, mode)
    fi_pct = fire_engine.calculate_fi_percentage(current_savings, fi_number)
    fi_date = fire_engine.estimate_fi_date(
        current_savings, monthly_contribution, fi_number, return_rate, inflation_rate
    )
    years_to_retirement = max(0, retirement_age - current_age)
    mc = fire_engine.monte_carlo_simulation(
        current_savings=current_savings,
        monthly_contribution=monthly_contribution,
        fi_number=fi_number,
        years_to_retirement=years_to_retirement,
        expected_return=return_rate,
        inflation_rate=inflation_rate,
        annual_spending=annual_spending,
    )
    return {
        "fi_number": round(fi_number, 2),
        "fi_percentage": round(fi_pct, 2),
        "fi_date_estimate": fi_date.isoformat() if fi_date else None,
        "mode": mode,
        "monte_carlo": mc,
    }


@router.get("/modes")
async def get_fire_modes() -> dict:
    """Return all FIRE mode configurations."""
    return fire_engine.FIRE_MODES


def _profile_to_dict(p: RetirementProfile) -> dict:
    return {
        "id": str(p.id),
        "household_id": str(p.household_id),
        "name": p.name,
        "current_age": p.current_age,
        "partner_current_age": p.partner_current_age,
        "retirement_age_target": p.retirement_age_target,
        "life_expectancy": p.life_expectancy,
        "current_savings": float(p.current_savings),
        "monthly_contribution": float(p.monthly_contribution),
        "employer_match_pct": float(p.employer_match_pct),
        "expected_return_rate": float(p.expected_return_rate),
        "inflation_rate": float(p.inflation_rate),
        "target_annual_spending": float(p.target_annual_spending),
        "social_security_estimate": float(p.social_security_estimate),
        "other_income": float(p.other_income),
        "fire_mode": p.fire_mode,
        "withdrawal_rate": float(p.withdrawal_rate),
        "fi_number": float(p.fi_number) if p.fi_number else None,
        "barista_income": float(p.barista_income),
        "cached_fi_percentage": float(p.cached_fi_percentage) if p.cached_fi_percentage else None,
        "cached_fi_date_estimate": p.cached_fi_date_estimate,
        "is_primary": p.is_primary,
        "created_at": p.created_at.isoformat(),
    }
