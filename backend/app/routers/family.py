from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.goal import Goal, GoalContribution
from app.models.household import Household, HouseholdMember

router = APIRouter(prefix="/family", tags=["family"])


class GoalCreate(BaseModel):
    name: str = Field(max_length=200)
    type: str = "custom"
    target_amount: float
    current_amount: float = 0.0
    target_date: date | None = None
    priority: int = Field(default=1, ge=1, le=10)
    color: str | None = None
    icon: str | None = None
    description: str | None = None
    monthly_contribution: float | None = None
    linked_account_id: uuid.UUID | None = None


class GoalUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    target_amount: float | None = None
    current_amount: float | None = None
    target_date: date | None = None
    priority: int | None = Field(default=None, ge=1, le=10)
    color: str | None = None
    is_active: bool | None = None
    monthly_contribution: float | None = None


class GoalContributionCreate(BaseModel):
    amount: float
    date: date
    note: str | None = None


class HouseholdUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    currency: str | None = None
    timezone: str | None = None
    fiscal_year_start_month: int | None = Field(default=None, ge=1, le=12)


# ── Household ─────────────────────────────────────────────────────────────────

@router.get("/household")
async def get_household(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Household)
        .where(Household.id == household.id)
        .options(selectinload(Household.members).selectinload(HouseholdMember.user))
    )
    hh = result.scalar_one_or_none()
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    return {
        "id": str(hh.id),
        "name": hh.name,
        "slug": hh.slug,
        "currency": hh.currency,
        "timezone": hh.timezone,
        "fiscal_year_start_month": hh.fiscal_year_start_month,
        "members": [
            {
                "id": str(m.id),
                "user_id": str(m.user_id),
                "role": m.role,
                "display_name": m.display_name or m.user.full_name,
                "is_primary": m.is_primary,
                "email": m.user.email,
            }
            for m in hh.members
        ],
        "created_at": hh.created_at.isoformat(),
    }


@router.patch("/household")
async def update_household(
    body: HouseholdUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Household).where(Household.id == household.id))
    hh = result.scalar_one_or_none()
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(hh, field, value)
    await db.flush()
    return {"id": str(hh.id), "name": hh.name, "currency": hh.currency, "timezone": hh.timezone}


# ── Goals ─────────────────────────────────────────────────────────────────────

@router.get("/goals")
async def list_goals(
    active_only: bool = True,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    filters = [Goal.household_id == household.id]
    if active_only:
        filters.append(Goal.is_active == True)
    result = await db.execute(
        select(Goal).where(and_(*filters)).order_by(Goal.priority, Goal.name)
    )
    goals = result.scalars().all()
    return [_goal_to_dict(g) for g in goals]


@router.post("/goals", status_code=status.HTTP_201_CREATED)
async def create_goal(
    body: GoalCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    goal = Goal(
        household_id=household.id,
        name=body.name,
        type=body.type,
        target_amount=Decimal(str(body.target_amount)),
        current_amount=Decimal(str(body.current_amount)),
        target_date=body.target_date,
        priority=body.priority,
        color=body.color,
        icon=body.icon,
        description=body.description,
        monthly_contribution=Decimal(str(body.monthly_contribution)) if body.monthly_contribution else None,
        linked_account_id=body.linked_account_id,
    )
    db.add(goal)
    await db.flush()
    return _goal_to_dict(goal)


@router.get("/goals/{goal_id}")
async def get_goal(
    goal_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id, Goal.household_id == household.id)
        .options(selectinload(Goal.contributions))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    data = _goal_to_dict(goal)
    data["contributions"] = [
        {
            "id": str(c.id),
            "amount": float(c.amount),
            "date": c.date.isoformat(),
            "note": c.note,
        }
        for c in sorted(goal.contributions, key=lambda x: x.date, reverse=True)
    ]
    return data


@router.patch("/goals/{goal_id}")
async def update_goal(
    goal_id: uuid.UUID,
    body: GoalUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.household_id == household.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if field in ("target_amount", "current_amount", "monthly_contribution") and value is not None:
            value = Decimal(str(value))
        setattr(goal, field, value)
    await db.flush()
    return _goal_to_dict(goal)


@router.post("/goals/{goal_id}/contribute", status_code=status.HTTP_201_CREATED)
async def add_contribution(
    goal_id: uuid.UUID,
    body: GoalContributionCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.household_id == household.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    contribution = GoalContribution(
        goal_id=goal.id,
        amount=Decimal(str(body.amount)),
        date=body.date,
        note=body.note,
    )
    goal.current_amount += Decimal(str(body.amount))
    if goal.current_amount >= goal.target_amount:
        from datetime import datetime, timezone
        goal.is_completed = True
        goal.completed_at = datetime.now(tz=timezone.utc)

    db.add(contribution)
    await db.flush()
    return {
        "id": str(contribution.id),
        "goal_id": str(goal_id),
        "amount": float(contribution.amount),
        "date": contribution.date.isoformat(),
        "new_balance": float(goal.current_amount),
        "progress_pct": goal.progress_pct,
    }


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.household_id == household.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.is_active = False
    await db.flush()


def _goal_to_dict(g: Goal) -> dict:
    return {
        "id": str(g.id),
        "name": g.name,
        "type": g.type,
        "target_amount": float(g.target_amount),
        "current_amount": float(g.current_amount),
        "remaining_amount": float(g.remaining_amount),
        "progress_pct": g.progress_pct,
        "target_date": g.target_date.isoformat() if g.target_date else None,
        "priority": g.priority,
        "color": g.color,
        "icon": g.icon,
        "description": g.description,
        "is_active": g.is_active,
        "is_completed": g.is_completed,
        "completed_at": g.completed_at.isoformat() if g.completed_at else None,
        "monthly_contribution": float(g.monthly_contribution) if g.monthly_contribution else None,
        "created_at": g.created_at.isoformat(),
    }
