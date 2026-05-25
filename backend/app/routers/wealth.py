from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.account import Account, Asset
from app.models.household import Household
from app.services import wealth_service

router = APIRouter(prefix="/wealth", tags=["wealth"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    name: str = Field(max_length=200)
    type: str  # checking, savings, credit, loan, investment, asset, mortgage
    institution: str | None = Field(default=None, max_length=200)
    balance: float = 0.0
    currency: str = "USD"
    color: str | None = None
    icon: str | None = None
    apr: float | None = None
    minimum_payment: float | None = None
    credit_limit: float | None = None
    notes: str | None = None


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    institution: str | None = Field(default=None, max_length=200)
    balance: float | None = None
    is_active: bool | None = None
    is_hidden: bool | None = None
    color: str | None = None
    apr: float | None = None
    minimum_payment: float | None = None
    credit_limit: float | None = None
    notes: str | None = None


class AssetCreate(BaseModel):
    name: str = Field(max_length=200)
    type: str = "other"
    estimated_value: float
    purchase_price: float | None = None
    description: str | None = None


# ── Net Worth ─────────────────────────────────────────────────────────────────

@router.get("/net-worth")
async def get_net_worth(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await wealth_service.get_net_worth_breakdown(db, household.id)


@router.get("/net-worth/history")
async def get_net_worth_history(
    months: int = Query(12, ge=1, le=60),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    return await wealth_service.get_net_worth_history(db, household.id, months)


@router.get("/investments")
async def get_investments(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await wealth_service.get_investment_allocation(db, household.id)


# ── Accounts ──────────────────────────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts(
    type: str | None = None,
    include_hidden: bool = False,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    filters = [Account.household_id == household.id, Account.is_active == True]
    if not include_hidden:
        filters.append(Account.is_hidden == False)
    if type:
        filters.append(Account.type == type)

    result = await db.execute(
        select(Account).where(and_(*filters)).order_by(Account.name)
    )
    accounts = result.scalars().all()
    return [_account_to_dict(a) for a in accounts]


@router.post("/accounts", status_code=status.HTTP_201_CREATED)
async def create_account(
    body: AccountCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    acc = Account(
        household_id=household.id,
        name=body.name,
        type=body.type,
        institution=body.institution,
        balance=Decimal(str(body.balance)),
        currency=body.currency,
        color=body.color,
        icon=body.icon,
        apr=Decimal(str(body.apr)) if body.apr is not None else None,
        minimum_payment=Decimal(str(body.minimum_payment)) if body.minimum_payment else None,
        credit_limit=Decimal(str(body.credit_limit)) if body.credit_limit else None,
        notes=body.notes,
    )
    db.add(acc)
    await db.flush()
    return _account_to_dict(acc)


@router.get("/accounts/{account_id}")
async def get_account(
    account_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.household_id == household.id)
    )
    acc = result.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    return _account_to_dict(acc)


@router.patch("/accounts/{account_id}")
async def update_account(
    account_id: uuid.UUID,
    body: AccountUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.household_id == household.id)
    )
    acc = result.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if field == "balance" and value is not None:
            value = Decimal(str(value))
        elif field == "apr" and value is not None:
            value = Decimal(str(value))
        elif field == "minimum_payment" and value is not None:
            value = Decimal(str(value))
        setattr(acc, field, value)
    await db.flush()
    return _account_to_dict(acc)


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.household_id == household.id)
    )
    acc = result.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    acc.is_active = False
    await db.flush()


def _account_to_dict(a: Account) -> dict:
    return {
        "id": str(a.id),
        "firefly_id": a.firefly_id,
        "name": a.name,
        "type": a.type,
        "institution": a.institution,
        "balance": float(a.balance),
        "currency": a.currency,
        "is_active": a.is_active,
        "is_hidden": a.is_hidden,
        "color": a.color,
        "icon": a.icon,
        "apr": float(a.apr) if a.apr is not None else None,
        "minimum_payment": float(a.minimum_payment) if a.minimum_payment else None,
        "credit_limit": float(a.credit_limit) if a.credit_limit else None,
        "notes": a.notes,
        "last_synced_at": a.last_synced_at.isoformat() if a.last_synced_at else None,
        "created_at": a.created_at.isoformat(),
        "updated_at": a.updated_at.isoformat(),
    }


# ── Physical Assets ───────────────────────────────────────────────────────────

@router.get("/assets")
async def list_assets(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Asset).where(Asset.household_id == household.id, Asset.is_active == True)
    )
    assets = result.scalars().all()
    return [
        {
            "id": str(a.id),
            "name": a.name,
            "type": a.type,
            "estimated_value": float(a.estimated_value),
            "purchase_price": float(a.purchase_price) if a.purchase_price else None,
            "description": a.description,
            "created_at": a.created_at.isoformat(),
        }
        for a in assets
    ]


@router.post("/assets", status_code=status.HTTP_201_CREATED)
async def create_asset(
    body: AssetCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    asset = Asset(
        household_id=household.id,
        name=body.name,
        type=body.type,
        estimated_value=Decimal(str(body.estimated_value)),
        purchase_price=Decimal(str(body.purchase_price)) if body.purchase_price else None,
        description=body.description,
    )
    db.add(asset)
    await db.flush()
    return {
        "id": str(asset.id),
        "name": asset.name,
        "type": asset.type,
        "estimated_value": float(asset.estimated_value),
        "created_at": asset.created_at.isoformat(),
    }
