import calendar
import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_household
from app.models.bill import Bill
from app.models.household import Household

router = APIRouter(prefix="/bills", tags=["bills"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class BillCreate(BaseModel):
    name: str = Field(max_length=200)
    amount: float = Field(gt=0)
    due_day_of_month: int = Field(ge=1, le=31)
    category: str = Field(default="General", max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    auto_pay: bool = False
    account_id: uuid.UUID | None = None


class BillUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    amount: float | None = Field(default=None, gt=0)
    due_day_of_month: int | None = Field(default=None, ge=1, le=31)
    category: str | None = Field(default=None, max_length=100)
    icon: str | None = None
    auto_pay: bool | None = None
    account_id: uuid.UUID | None = None
    is_active: bool | None = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def compute_due_info(bill: Bill, today: date) -> dict[str, Any]:
    """Return next due_date and status for a bill."""
    year, month = today.year, today.month
    last_day = calendar.monthrange(year, month)[1]
    this_month_due = date(year, month, min(bill.due_day_of_month, last_day))

    # Already paid this billing cycle?
    if bill.last_paid_date and bill.last_paid_date >= this_month_due:
        if month == 12:
            ny, nm = year + 1, 1
        else:
            ny, nm = year, month + 1
        nd_last = calendar.monthrange(ny, nm)[1]
        due = date(ny, nm, min(bill.due_day_of_month, nd_last))
        return {"due_date": due.isoformat(), "status": "upcoming"}

    if this_month_due < today:
        return {"due_date": this_month_due.isoformat(), "status": "overdue"}
    if this_month_due == today:
        return {"due_date": this_month_due.isoformat(), "status": "due"}
    return {"due_date": this_month_due.isoformat(), "status": "upcoming"}


def _bill_to_dict(bill: Bill, today: date | None = None) -> dict[str, Any]:
    if today is None:
        today = date.today()
    info = compute_due_info(bill, today)
    return {
        "id": str(bill.id),
        "name": bill.name,
        "amount": float(bill.amount),
        "due_day_of_month": bill.due_day_of_month,
        "due_date": info["due_date"],
        "status": info["status"],
        "category": bill.category,
        "icon": bill.icon,
        "auto_pay": bill.auto_pay,
        "is_active": bill.is_active,
        "account_id": str(bill.account_id) if bill.account_id else None,
        "last_paid_date": bill.last_paid_date.isoformat() if bill.last_paid_date else None,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("")
async def list_bills(
    include_inactive: bool = False,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    filters = [Bill.household_id == household.id]
    if not include_inactive:
        filters.append(Bill.is_active == True)
    result = await db.execute(
        select(Bill).where(and_(*filters)).order_by(Bill.due_day_of_month)
    )
    bills = result.scalars().all()
    today = date.today()
    return [_bill_to_dict(b, today) for b in bills]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_bill(
    body: BillCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    bill = Bill(
        household_id=household.id,
        name=body.name,
        amount=Decimal(str(body.amount)),
        due_day_of_month=body.due_day_of_month,
        category=body.category,
        icon=body.icon,
        auto_pay=body.auto_pay,
        account_id=body.account_id,
    )
    db.add(bill)
    await db.flush()
    return _bill_to_dict(bill)


@router.patch("/{bill_id}")
async def update_bill(
    bill_id: uuid.UUID,
    body: BillUpdate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Bill).where(Bill.id == bill_id, Bill.household_id == household.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    for field, value in body.model_dump(exclude_none=True).items():
        if field == "amount" and value is not None:
            value = Decimal(str(value))
        setattr(bill, field, value)
    await db.flush()
    return _bill_to_dict(bill)


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(
    bill_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Bill).where(Bill.id == bill_id, Bill.household_id == household.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill.is_active = False
    await db.flush()


@router.post("/{bill_id}/mark-paid")
async def mark_bill_paid(
    bill_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Bill).where(Bill.id == bill_id, Bill.household_id == household.id)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill.last_paid_date = date.today()
    await db.flush()
    return _bill_to_dict(bill)
