from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.household import Household
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Full command center data for the dashboard."""
    data = await dashboard_service.get_command_center_data(db, household.id)
    data["household_name"] = household.name
    return data


@router.get("/safe-to-spend")
async def get_safe_to_spend(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Calculate the Safe-to-Spend number."""
    return await dashboard_service.calculate_safe_to_spend(db, household.id)


@router.get("/debt-waterfall")
async def get_debt_waterfall(
    method: str = "avalanche",
    extra_monthly_payment: float = 0.0,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get debt payoff waterfall. method: 'avalanche' or 'snowball'."""
    if method not in ("avalanche", "snowball"):
        method = "avalanche"
    return await dashboard_service.get_debt_waterfall(db, household.id, method, extra_monthly_payment)


@router.get("/forecast")
async def get_forecast(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """30/60/90 day cash flow forecast."""
    return await dashboard_service.get_monthly_forecast(db, household.id)
