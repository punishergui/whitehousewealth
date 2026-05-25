"""Agent API — read/write endpoints for the external Hermes AI agent.

All routes require the X-Agent-Key header matching settings.AGENT_API_KEY.
No AI inference happens here. This is a thin CRUD + aggregate data API.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
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
from app.services.dashboard_service import get_command_center_data

router = APIRouter(prefix="/agent", tags=["agent"])

_key_header = APIKeyHeader(name="X-Agent-Key", auto_error=False)


async def require_agent_key(key: str | None = Security(_key_header)) -> None:
    if not settings.AGENT_API_KEY or key != settings.AGENT_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Agent-Key",
        )


async def _get_household(household_id: uuid.UUID | None, db: AsyncSession) -> Household:
    """Return household by ID, or the first household in the DB if None."""
    if household_id:
        result = await db.execute(select(Household).where(Household.id == household_id))
    else:
        result = await db.execute(select(Household).limit(1))
    hh = result.scalar_one_or_none()
    if not hh:
        raise HTTPException(status_code=404, detail="Household not found")
    return hh


# ── Snapshot ───────────────────────────────────────────────────────────────────

@router.get("/snapshot", dependencies=[Depends(require_agent_key)])
async def get_snapshot(
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Full financial snapshot: accounts, goals, bills, debts, recent transactions, metrics."""
    hh = await _get_household(household_id, db)
    data = await get_command_center_data(db, hh.id)

    # Accounts
    acct_result = await db.execute(
        select(Account).where(Account.household_id == hh.id, Account.is_active == True)
    )
    accounts = [
        {
            "id": str(a.id),
            "name": a.name,
            "type": a.type,
            "balance": float(a.balance),
            "currency": a.currency,
        }
        for a in acct_result.scalars().all()
    ]

    # Goals
    goal_result = await db.execute(
        select(Goal).where(Goal.household_id == hh.id, Goal.is_active == True)
    )
    goals = [
        {
            "id": str(g.id),
            "name": g.name,
            "type": g.type,
            "current_amount": float(g.current_amount),
            "target_amount": float(g.target_amount),
            "target_date": g.target_date.isoformat() if g.target_date else None,
        }
        for g in goal_result.scalars().all()
    ]

    # Recent transactions (30d)
    since = date.today() - timedelta(days=30)
    txn_result = await db.execute(
        select(Transaction)
        .where(
            Transaction.household_id == hh.id,
            Transaction.date >= since,
        )
        .order_by(Transaction.date.desc())
        .limit(200)
    )
    transactions = [
        {
            "id": str(t.id),
            "date": t.date.isoformat(),
            "description": t.description,
            "merchant": t.merchant_name,
            "amount": float(t.amount),
            "type": t.type,
            "category_id": str(t.category_id) if t.category_id else None,
        }
        for t in txn_result.scalars().all()
    ]

    return {
        "household_id": str(hh.id),
        "household_name": hh.name,
        "accounts": accounts,
        "goals": goals,
        "upcoming_bills": data["upcoming_bills"],
        "recent_transactions": transactions,
        "net_worth": data["net_worth"],
        "safe_to_spend": data["safe_to_spend"]["safe_to_spend"],
        "monthly_cash_flow": data["this_month"],
        "snapshot_at": datetime.now(tz=timezone.utc).isoformat(),
    }


# ── Uncategorized Transactions ─────────────────────────────────────────────────

@router.get("/uncategorized-transactions", dependencies=[Depends(require_agent_key)])
async def get_uncategorized_transactions(
    since: date | None = Query(default=None, description="ISO date, e.g. 2026-01-01"),
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    hh = await _get_household(household_id, db)
    conditions = [
        Transaction.household_id == hh.id,
        Transaction.category_id == None,
    ]
    if since:
        conditions.append(Transaction.date >= since)

    result = await db.execute(
        select(Transaction)
        .where(and_(*conditions))
        .order_by(Transaction.date.desc())
        .limit(500)
    )
    return [
        {
            "id": str(t.id),
            "date": t.date.isoformat(),
            "description": t.description,
            "merchant": t.merchant_name,
            "amount": float(t.amount),
            "type": t.type,
        }
        for t in result.scalars().all()
    ]


# ── Categories ─────────────────────────────────────────────────────────────────

@router.get("/categories", dependencies=[Depends(require_agent_key)])
async def get_categories(
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    hh = await _get_household(household_id, db)
    result = await db.execute(
        select(Category)
        .where(Category.household_id == hh.id)
        .order_by(Category.name)
    )
    return [
        {"id": str(c.id), "name": c.name, "type": c.type}
        for c in result.scalars().all()
    ]


# ── Categorize Transactions ────────────────────────────────────────────────────

class CategorizationAssignment(BaseModel):
    transaction_id: uuid.UUID
    category_id: uuid.UUID
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    reasoning: str | None = None


class CategorizeRequest(BaseModel):
    assignments: list[CategorizationAssignment] = Field(min_length=1, max_length=500)


@router.post("/categorize", dependencies=[Depends(require_agent_key)], status_code=status.HTTP_200_OK)
async def categorize_transactions(
    body: CategorizeRequest,
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(household_id, db)
    applied = 0
    for a in body.assignments:
        result = await db.execute(
            select(Transaction).where(
                Transaction.id == a.transaction_id,
                Transaction.household_id == hh.id,
            )
        )
        txn = result.scalar_one_or_none()
        if not txn:
            continue
        txn.category_id = a.category_id
        log = AgentCategorizationLog(
            household_id=hh.id,
            transaction_id=a.transaction_id,
            category_id=a.category_id,
            confidence=a.confidence,
            reasoning=a.reasoning,
        )
        db.add(log)
        applied += 1

    await db.flush()
    return {"applied": applied, "total": len(body.assignments)}


# ── Briefing ───────────────────────────────────────────────────────────────────

class BriefingRequest(BaseModel):
    title: str = Field(max_length=300)
    body: str
    for_date: date | None = None


@router.post("/briefing", dependencies=[Depends(require_agent_key)], status_code=status.HTTP_201_CREATED)
async def post_briefing(
    body: BriefingRequest,
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(household_id, db)
    briefing = AgentBriefing(
        household_id=hh.id,
        title=body.title,
        body=body.body,
        for_date=body.for_date or date.today(),
    )
    db.add(briefing)
    await db.flush()
    return {"id": str(briefing.id), "for_date": briefing.for_date.isoformat()}


# ── Priorities ─────────────────────────────────────────────────────────────────

class PriorityItem(BaseModel):
    title: str = Field(max_length=300)
    subtitle: str | None = None
    amount: float | None = None
    deadline: date | None = None
    severity: str = Field(default="medium", pattern="^(high|medium|low)$")


class PrioritiesRequest(BaseModel):
    items: list[PriorityItem] = Field(max_length=20)


@router.post("/priorities", dependencies=[Depends(require_agent_key)], status_code=status.HTTP_200_OK)
async def post_priorities(
    body: PrioritiesRequest,
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(household_id, db)
    # Replace all existing priorities for this household
    await db.execute(delete(AgentPriority).where(AgentPriority.household_id == hh.id))
    for i, item in enumerate(body.items):
        priority = AgentPriority(
            household_id=hh.id,
            title=item.title,
            subtitle=item.subtitle,
            amount=Decimal(str(item.amount)) if item.amount is not None else None,
            deadline=item.deadline,
            severity=item.severity,
            position=i,
        )
        db.add(priority)
    await db.flush()
    return {"replaced": len(body.items)}


# ── Anomalies ──────────────────────────────────────────────────────────────────

class AnomalyItem(BaseModel):
    title: str = Field(max_length=300)
    description: str | None = None
    amount: float | None = None
    transaction_id: uuid.UUID | None = None
    severity: str = Field(default="medium", pattern="^(high|medium|low)$")


class AnomaliesRequest(BaseModel):
    items: list[AnomalyItem] = Field(max_length=50)


@router.post("/anomalies", dependencies=[Depends(require_agent_key)], status_code=status.HTTP_201_CREATED)
async def post_anomalies(
    body: AnomaliesRequest,
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(household_id, db)
    for item in body.items:
        anomaly = AgentAnomaly(
            household_id=hh.id,
            title=item.title,
            description=item.description,
            amount=Decimal(str(item.amount)) if item.amount is not None else None,
            transaction_id=item.transaction_id,
            severity=item.severity,
        )
        db.add(anomaly)
    await db.flush()
    return {"created": len(body.items)}


# ── Sync Request ───────────────────────────────────────────────────────────────

class SyncRequestBody(BaseModel):
    task: str = Field(max_length=200)
    note: str | None = None


@router.post("/sync-request", dependencies=[Depends(require_agent_key)], status_code=status.HTTP_201_CREATED)
async def create_sync_request(
    body: SyncRequestBody,
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(household_id, db)
    job = AgentJob(
        household_id=hh.id,
        task=body.task,
        note=body.note,
        status="pending",
    )
    db.add(job)
    await db.flush()
    return {"job_id": str(job.id), "status": job.status}


# ── Jobs ───────────────────────────────────────────────────────────────────────

@router.get("/jobs/pending", dependencies=[Depends(require_agent_key)])
async def list_pending_jobs(
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    hh = await _get_household(household_id, db)
    result = await db.execute(
        select(AgentJob)
        .where(AgentJob.household_id == hh.id, AgentJob.status == "pending")
        .order_by(AgentJob.created_at.asc())
    )
    return [
        {
            "id": str(j.id),
            "task": j.task,
            "note": j.note,
            "created_at": j.created_at.isoformat(),
        }
        for j in result.scalars().all()
    ]


class CompleteJobBody(BaseModel):
    result_summary: str | None = None


@router.post("/jobs/{job_id}/complete", dependencies=[Depends(require_agent_key)], status_code=status.HTTP_200_OK)
async def complete_job(
    job_id: uuid.UUID,
    body: CompleteJobBody,
    household_id: uuid.UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    hh = await _get_household(household_id, db)
    result = await db.execute(
        select(AgentJob).where(AgentJob.id == job_id, AgentJob.household_id == hh.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = "done"
    job.result_summary = body.result_summary
    job.completed_at = datetime.now(tz=timezone.utc)
    await db.flush()
    return {"id": str(job.id), "status": job.status}
