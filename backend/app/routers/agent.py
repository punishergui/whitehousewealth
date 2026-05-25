from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.deps import get_current_household
from app.models.account import Account
from app.models.agent import (
    AgentAnomaly,
    AgentBriefing,
    AgentCategorizationLog,
    AgentJob,
    AgentPriority,
)
from app.models.goal import Goal
from app.models.household import Household
from app.models.transaction import Category, Transaction

router = APIRouter(prefix="/agent", tags=["agent"])

# ── Authentication ────────────────────────────────────────────────────────────

_agent_key_header = APIKeyHeader(name="X-Agent-Key", auto_error=False)


async def require_agent_key(key: str | None = Depends(_agent_key_header)) -> None:
    if not key or key != settings.AGENT_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Agent-Key",
        )


AgentAuth = Annotated[None, Depends(require_agent_key)]


# ── Helper: resolve household from query param or single-household default ───

async def _get_household(
    db: AsyncSession,
    household_id: uuid.UUID | None,
) -> Household:
    if household_id:
        result = await db.execute(
            select(Household).where(Household.id == household_id)
        )
    else:
        result = await db.execute(select(Household).limit(1))
    hh = result.scalar_one_or_none()
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    return hh


# ── Schemas ───────────────────────────────────────────────────────────────────

class CategorizationItem(BaseModel):
    transaction_id: uuid.UUID
    category_id: uuid.UUID
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str = ""


class CategorizeBody(BaseModel):
    assignments: list[CategorizationItem]


class BriefingBody(BaseModel):
    title: str
    body: str
    for_date: date | None = None


class PriorityItem(BaseModel):
    title: str
    subtitle: str | None = None
    amount: float | None = None
    deadline: date | None = None
    severity: str = "info"


class PrioritiesBody(BaseModel):
    items: list[PriorityItem]


class AnomalyItem(BaseModel):
    description: str
    severity: str = "medium"
    category: str
    amount: float | None = None


class AnomaliesBody(BaseModel):
    items: list[AnomalyItem]


class SyncRequestBody(BaseModel):
    task: str = "all"
    note: str | None = None


class CompleteJobBody(BaseModel):
    result_summary: str | None = None


# ── READ ENDPOINTS ────────────────────────────────────────────────────────────

@router.get("/snapshot")
async def get_snapshot(
    _auth: AgentAuth,
    household_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Full financial snapshot for the AI agent to reason about."""
    hh = await _get_household(db, household_id)
    today = date.today()
    month_start = today.replace(day=1)
    since_30 = today - timedelta(days=30)

    # Accounts
    accounts_result = await db.execute(
        select(Account).where(
            and_(Account.household_id == hh.id, Account.is_active == True)
        )
    )
    accounts = accounts_result.scalars().all()
    accounts_data = [
        {
            "id": str(a.id),
            "name": a.name,
            "type": a.type,
            "balance": float(a.balance),
            "institution": a.notes or "",
            "is_active": a.is_active,
        }
        for a in accounts
    ]

    # Goals
    goals_result = await db.execute(
        select(Goal).where(
            and_(Goal.household_id == hh.id, Goal.is_active == True)
        ).order_by(Goal.priority)
    )
    goals = goals_result.scalars().all()
    goals_data = [
        {
            "id": str(g.id),
            "name": g.name,
            "type": g.type,
            "current_amount": float(g.current_amount),
            "target_amount": float(g.target_amount),
            "target_date": g.target_date.isoformat() if g.target_date else None,
            "priority": g.priority,
            "color": g.color,
        }
        for g in goals
    ]

    # Recent transactions (last 30 days, max 200)
    txn_result = await db.execute(
        select(Transaction)
        .where(
            and_(
                Transaction.household_id == hh.id,
                Transaction.date >= since_30,
            )
        )
        .options(selectinload(Transaction.category))
        .options(selectinload(Transaction.account))
        .order_by(Transaction.date.desc())
        .limit(200)
    )
    txns = txn_result.scalars().all()
    txns_data = [
        {
            "id": str(t.id),
            "date": t.date.isoformat(),
            "description": t.description,
            "merchant_name": t.merchant_name,
            "amount": float(t.amount),
            "category_name": t.category.name if t.category else None,
            "account_name": t.account.name if t.account else None,
        }
        for t in txns
    ]

    # Debts (credit/loan/mortgage with negative balance)
    debts_result = await db.execute(
        select(Account).where(
            and_(
                Account.household_id == hh.id,
                Account.is_active == True,
                Account.type.in_(["credit", "loan", "mortgage"]),
            )
        )
    )
    debts = debts_result.scalars().all()
    debts_data = [
        {
            "account_id": str(d.id),
            "name": d.name,
            "balance": float(d.balance),
            "apr": float(d.apr) if d.apr else None,
            "min_payment": float(d.minimum_payment) if d.minimum_payment else None,
            "payoff_date": d.promo_expires_at.isoformat() if d.promo_expires_at else None,
        }
        for d in debts
    ]

    # This month income/expense
    income_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.household_id == hh.id,
                Transaction.type == "income",
                Transaction.date >= month_start,
                Transaction.date <= today,
            )
        )
    )
    month_income = float(income_result.scalar() or 0)

    expense_result = await db.execute(
        select(func.sum(func.abs(Transaction.amount))).where(
            and_(
                Transaction.household_id == hh.id,
                Transaction.type == "expense",
                Transaction.date >= month_start,
                Transaction.date <= today,
            )
        )
    )
    month_expense = float(expense_result.scalar() or 0)

    # Net worth summary
    positive_bal = sum(float(a.balance) for a in accounts if float(a.balance) > 0)
    negative_bal = sum(abs(float(a.balance)) for a in accounts if float(a.balance) < 0)
    net_worth = positive_bal - negative_bal

    liquid = sum(
        float(a.balance) for a in accounts
        if a.type in ("checking", "savings") and float(a.balance) > 0
    )

    return {
        "household": {
            "id": str(hh.id),
            "name": hh.name,
            "created_at": hh.created_at.isoformat(),
        },
        "accounts": accounts_data,
        "goals": goals_data,
        "recent_transactions": txns_data,
        "debts": debts_data,
        "this_month": {
            "income": round(month_income, 2),
            "expense": round(month_expense, 2),
            "net": round(month_income - month_expense, 2),
        },
        "summary": {
            "net_worth": round(net_worth, 2),
            "safe_to_spend": round(liquid, 2),
            "monthly_cash_flow": round(month_income - month_expense, 2),
            "emergency_fund_months": None,
        },
    }


@router.get("/uncategorized-transactions")
async def get_uncategorized_transactions(
    _auth: AgentAuth,
    since: date | None = Query(None),
    household_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    hh = await _get_household(db, household_id)
    since_date = since or (date.today() - timedelta(days=30))

    result = await db.execute(
        select(Transaction)
        .where(
            and_(
                Transaction.household_id == hh.id,
                Transaction.category_id == None,  # noqa: E711
                Transaction.date >= since_date,
            )
        )
        .options(selectinload(Transaction.account))
        .order_by(Transaction.date.desc())
    )
    txns = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "date": t.date.isoformat(),
            "description": t.description,
            "merchant_name": t.merchant_name,
            "amount": float(t.amount),
            "account_name": t.account.name if t.account else None,
        }
        for t in txns
    ]


@router.get("/categories")
async def get_categories(
    _auth: AgentAuth,
    household_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    hh = await _get_household(db, household_id)
    result = await db.execute(
        select(Category).where(Category.household_id == hh.id).order_by(Category.name)
    )
    cats = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "type": None,
            "parent_id": str(c.parent_id) if c.parent_id else None,
            "color": c.color,
        }
        for c in cats
    ]


@router.get("/jobs/pending")
async def get_pending_jobs(
    _auth: AgentAuth,
    household_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    hh = await _get_household(db, household_id)
    result = await db.execute(
        select(AgentJob)
        .where(
            and_(
                AgentJob.household_id == hh.id,
                AgentJob.status == "pending",
            )
        )
        .order_by(AgentJob.created_at)
    )
    jobs = result.scalars().all()
    return [
        {
            "id": str(j.id),
            "task": j.task,
            "note": j.note,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]


# ── WRITE ENDPOINTS ───────────────────────────────────────────────────────────

@router.post("/categorize")
async def categorize_transactions(
    body: CategorizeBody,
    _auth: AgentAuth,
    db: AsyncSession = Depends(get_db),
) -> dict:
    updated = 0
    errors: list[dict] = []

    for item in body.assignments:
        try:
            result = await db.execute(
                select(Transaction).where(Transaction.id == item.transaction_id)
            )
            txn = result.scalar_one_or_none()
            if not txn:
                errors.append({"transaction_id": str(item.transaction_id), "error": "not found"})
                continue

            txn.category_id = item.category_id

            log = AgentCategorizationLog(
                transaction_id=item.transaction_id,
                category_id=item.category_id,
                reasoning=item.reasoning,
                confidence=item.confidence,
                agent_name="hermes",
            )
            db.add(log)
            updated += 1
        except Exception as exc:
            errors.append({"transaction_id": str(item.transaction_id), "error": str(exc)})

    await db.flush()
    return {"updated": updated, "errors": errors}


@router.post("/briefing")
async def post_briefing(
    body: BriefingBody,
    _auth: AgentAuth,
    household_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(db, household_id)
    for_date = body.for_date or date.today()

    briefing = AgentBriefing(
        household_id=hh.id,
        title=body.title,
        body=body.body,
        for_date=for_date,
    )
    db.add(briefing)
    await db.flush()
    return {"id": str(briefing.id), "for_date": for_date.isoformat()}


@router.post("/priorities")
async def set_priorities(
    body: PrioritiesBody,
    _auth: AgentAuth,
    household_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(db, household_id)

    # Replace all existing priorities for this household
    await db.execute(
        delete(AgentPriority).where(AgentPriority.household_id == hh.id)
    )

    for pos, item in enumerate(body.items):
        priority = AgentPriority(
            household_id=hh.id,
            title=item.title,
            subtitle=item.subtitle,
            amount=item.amount,
            deadline=item.deadline,
            severity=item.severity,
            position=pos,
        )
        db.add(priority)

    await db.flush()
    return {"saved": len(body.items)}


@router.post("/anomalies")
async def post_anomalies(
    body: AnomaliesBody,
    _auth: AgentAuth,
    household_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(db, household_id)

    for item in body.items:
        anomaly = AgentAnomaly(
            household_id=hh.id,
            description=item.description,
            severity=item.severity,
            category=item.category,
            amount=item.amount,
        )
        db.add(anomaly)

    await db.flush()
    return {"saved": len(body.items)}


@router.post("/sync-request")
async def create_sync_request(
    body: SyncRequestBody,
    _auth: AgentAuth,
    household_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(db, household_id)

    job = AgentJob(
        household_id=hh.id,
        task=body.task,
        status="pending",
        note=body.note,
    )
    db.add(job)
    await db.flush()
    return {"job_id": str(job.id)}


@router.post("/jobs/{job_id}/complete")
async def complete_job(
    job_id: uuid.UUID,
    body: CompleteJobBody,
    _auth: AgentAuth,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(AgentJob).where(AgentJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "completed"
    job.completed_at = datetime.now(tz=timezone.utc)
    if body.result_summary:
        job.note = (job.note or "") + f"\n\nResult: {body.result_summary}"

    await db.flush()
    return {"ok": True}
