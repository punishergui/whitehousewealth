import uuid
from datetime import date as date_
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.household import Household
from app.models.budget import Budget, BudgetPeriod
from app.models.transaction import Category, Tag, Transaction

router = APIRouter(prefix="/money", tags=["money"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    date: date_
    amount: float
    description: str = Field(max_length=500)
    merchant_name: str | None = Field(default=None, max_length=200)
    category_id: uuid.UUID | None = None
    type: str = "expense"  # income, expense, transfer
    status: str = "cleared"
    notes: str | None = None
    is_recurring: bool = False


class TransactionUpdate(BaseModel):
    date: date_ | None = None
    amount: float | None = None
    description: str | None = Field(default=None, max_length=500)
    merchant_name: str | None = Field(default=None, max_length=200)
    category_id: uuid.UUID | None = None
    type: str | None = None
    status: str | None = None
    notes: str | None = None
    is_recurring: bool | None = None


class CategoryCreate(BaseModel):
    name: str = Field(max_length=100)
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=50)
    parent_id: uuid.UUID | None = None


class BudgetCreate(BaseModel):
    name: str = Field(max_length=200)
    amount: float
    period: str = "monthly"
    category_id: uuid.UUID | None = None
    start_date: date_ | None = None
    end_date: date_ | None = None
    rollover: bool = False
    color: str | None = None


class BudgetUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    amount: float | None = None
    period: str | None = None
    rollover: bool | None = None
    is_active: bool | None = None


# ── Transactions ───────────────────────────────────────────────────────────────

@router.get("/transactions")
async def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    type: str | None = None,
    start_date: date_ | None = None,
    end_date: date_ | None = None,
    search: str | None = None,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    filters = [Transaction.household_id == household.id]
    if account_id:
        filters.append(Transaction.account_id == account_id)
    if category_id:
        filters.append(Transaction.category_id == category_id)
    if type:
        filters.append(Transaction.type == type)
    if start_date:
        filters.append(Transaction.date >= start_date)
    if end_date:
        filters.append(Transaction.date <= end_date)
    if search:
        filters.append(
            Transaction.description.ilike(f"%{search}%")
            | Transaction.merchant_name.ilike(f"%{search}%")
        )

    total_result = await db.execute(
        select(func.count(Transaction.id)).where(and_(*filters))
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Transaction)
        .where(and_(*filters))
        .options(selectinload(Transaction.category), selectinload(Transaction.tags))
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    transactions = result.scalars().all()

    return {
        "items": [_txn_to_dict(t) for t in transactions],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    txn = Transaction(
        account_id=body.account_id,
        household_id=household.id,
        date=body.date,
        amount=Decimal(str(body.amount)),
        description=body.description,
        merchant_name=body.merchant_name,
        category_id=body.category_id,
        type=body.type,
        status=body.status,
        notes=body.notes,
        is_recurring=body.is_recurring,
    )
    db.add(txn)
    await db.flush()
    await db.refresh(txn, ["category", "tags"])
    return _txn_to_dict(txn)


@router.get("/transactions/{txn_id}")
async def get_transaction(
    txn_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Transaction)
        .where(Transaction.id == txn_id, Transaction.household_id == household.id)
        .options(selectinload(Transaction.category), selectinload(Transaction.tags))
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _txn_to_dict(txn)


@router.patch("/transactions/{txn_id}")
async def update_transaction(
    txn_id: uuid.UUID,
    body: TransactionUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Transaction).where(Transaction.id == txn_id, Transaction.household_id == household.id)
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if field == "amount":
            value = Decimal(str(value))
        setattr(txn, field, value)
    await db.flush()
    await db.refresh(txn, ["category", "tags"])
    return _txn_to_dict(txn)


@router.delete("/transactions/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    txn_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Transaction).where(Transaction.id == txn_id, Transaction.household_id == household.id)
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.delete(txn)


def _txn_to_dict(t: Transaction) -> dict:
    return {
        "id": str(t.id),
        "account_id": str(t.account_id),
        "date": t.date.isoformat(),
        "amount": float(t.amount),
        "description": t.description,
        "merchant_name": t.merchant_name,
        "category_id": str(t.category_id) if t.category_id else None,
        "category_name": t.category.name if t.category else None,
        "type": t.type,
        "status": t.status,
        "notes": t.notes,
        "is_recurring": t.is_recurring,
        "tags": [{"id": str(tag.id), "name": tag.name} for tag in t.tags],
        "created_at": t.created_at.isoformat(),
    }


# ── Categories ─────────────────────────────────────────────────────────────────

@router.get("/categories")
async def list_categories(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Category).where(Category.household_id == household.id).order_by(Category.name)
    )
    categories = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "color": c.color,
            "icon": c.icon,
            "parent_id": str(c.parent_id) if c.parent_id else None,
            "is_system": c.is_system,
        }
        for c in categories
    ]


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    cat = Category(
        household_id=household.id,
        name=body.name,
        color=body.color,
        icon=body.icon,
        parent_id=body.parent_id,
    )
    db.add(cat)
    await db.flush()
    return {"id": str(cat.id), "name": cat.name, "color": cat.color, "icon": cat.icon}


# ── Budgets ────────────────────────────────────────────────────────────────────

@router.get("/budgets")
async def list_budgets(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Budget)
        .where(Budget.household_id == household.id, Budget.is_active == True)
        .options(selectinload(Budget.category))
        .order_by(Budget.name)
    )
    budgets = result.scalars().all()
    return [_budget_to_dict(b) for b in budgets]


@router.post("/budgets", status_code=status.HTTP_201_CREATED)
async def create_budget(
    body: BudgetCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    budget = Budget(
        household_id=household.id,
        name=body.name,
        amount=Decimal(str(body.amount)),
        period=body.period,
        category_id=body.category_id,
        start_date=body.start_date,
        end_date=body.end_date,
        rollover=body.rollover,
        color=body.color,
    )
    db.add(budget)
    await db.flush()
    return _budget_to_dict(budget)


@router.patch("/budgets/{budget_id}")
async def update_budget(
    budget_id: uuid.UUID,
    body: BudgetUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.household_id == household.id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if field == "amount":
            value = Decimal(str(value))
        setattr(budget, field, value)
    await db.flush()
    return _budget_to_dict(budget)


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.household_id == household.id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    await db.delete(budget)


def _budget_to_dict(b: Budget) -> dict:
    return {
        "id": str(b.id),
        "name": b.name,
        "amount": float(b.amount),
        "period": b.period,
        "category_id": str(b.category_id) if b.category_id else None,
        "category_name": b.category.name if b.category else None,
        "start_date": b.start_date.isoformat() if b.start_date else None,
        "end_date": b.end_date.isoformat() if b.end_date else None,
        "rollover": b.rollover,
        "is_active": b.is_active,
        "color": b.color,
    }


# ── Spending Summary ───────────────────────────────────────────────────────────

@router.get("/spending-summary")
async def get_spending_summary(
    start_date: date_ | None = None,
    end_date: date_ | None = None,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    today = date_.today()
    if not start_date:
        start_date = today.replace(day=1)
    if not end_date:
        end_date = today

    filters = [
        Transaction.household_id == household.id,
        Transaction.type == "expense",
        Transaction.date >= start_date,
        Transaction.date <= end_date,
    ]

    result = await db.execute(
        select(
            Category.name,
            Category.color,
            func.sum(func.abs(Transaction.amount)).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(and_(*filters))
        .group_by(Category.id, Category.name, Category.color)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
    )
    rows = result.all()

    total_spent = sum(float(r[2]) for r in rows)
    categories = [
        {
            "category": r[0],
            "color": r[1],
            "amount": float(r[2]),
            "count": r[3],
            "pct": round(float(r[2]) / total_spent * 100, 1) if total_spent > 0 else 0,
        }
        for r in rows
    ]

    # Uncategorized
    uncat_result = await db.execute(
        select(func.sum(func.abs(Transaction.amount))).where(
            and_(*filters, Transaction.category_id == None)
        )
    )
    uncategorized = float(uncat_result.scalar() or 0)

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_spent": round(total_spent + uncategorized, 2),
        "by_category": categories,
        "uncategorized": round(uncategorized, 2),
    }
