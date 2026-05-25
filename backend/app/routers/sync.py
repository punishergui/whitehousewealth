from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.household import Household
from app.models.sync import FireflyConfig, SyncJob
from app.services.firefly_sync import run_household_sync

router = APIRouter()


def _job_to_dict(job: SyncJob) -> dict:
    return {
        "id": str(job.id),
        "household_id": str(job.household_id),
        "status": job.status,
        "type": job.type,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "records_synced": job.records_synced,
        "error_message": job.error_message,
        "triggered_by": job.triggered_by,
        "created_at": job.created_at.isoformat(),
    }


# ── POST /sync/firefly — trigger manual sync ───────────────────────────────────

@router.post("/firefly", status_code=status.HTTP_202_ACCEPTED)
async def trigger_firefly_sync(
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Trigger a manual Firefly III delta sync for the current household.
    Creates a SyncJob record and runs the sync inline.
    Returns the completed (or failed) job.
    """
    # Verify Firefly config exists before attempting sync
    config_result = await db.execute(
        select(FireflyConfig).where(
            FireflyConfig.household_id == household.id,
            FireflyConfig.is_active == True,
        )
    )
    config = config_result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active Firefly III configuration found. Set up Firefly under Settings first.",
        )

    try:
        job = await run_household_sync(db, household.id, sync_type="delta")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sync failed: {str(exc)[:300]}",
        )

    return {
        "job_id": str(job.id),
        "status": job.status,
        "records_synced": job.records_synced,
        "message": (
            f"Sync completed — {job.records_synced} records synced."
            if job.status == "completed"
            else f"Sync failed: {job.error_message}"
        ),
    }


# ── GET /sync/jobs — list recent sync jobs ─────────────────────────────────────

@router.get("/jobs")
async def list_sync_jobs(
    limit: int = 20,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return the most recent sync jobs for the current household."""
    result = await db.execute(
        select(SyncJob)
        .where(SyncJob.household_id == household.id)
        .order_by(SyncJob.created_at.desc())
        .limit(min(limit, 100))
    )
    jobs = result.scalars().all()
    return [_job_to_dict(j) for j in jobs]


# ── GET /sync/jobs/{job_id} — get job status ───────────────────────────────────

@router.get("/jobs/{job_id}")
async def get_sync_job(
    job_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the status and details of a specific sync job."""
    result = await db.execute(
        select(SyncJob).where(
            SyncJob.id == job_id,
            SyncJob.household_id == household.id,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")
    return _job_to_dict(job)


# ── GET /sync/config — Firefly connection status ───────────────────────────────

@router.get("/config")
async def get_sync_config(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the Firefly III connection status and last sync time."""
    config_result = await db.execute(
        select(FireflyConfig).where(FireflyConfig.household_id == household.id)
    )
    config = config_result.scalar_one_or_none()

    if not config:
        return {
            "connected": False,
            "is_active": False,
            "last_sync": None,
            "base_url": None,
        }

    # Last completed sync job
    last_job_result = await db.execute(
        select(SyncJob)
        .where(
            SyncJob.household_id == household.id,
            SyncJob.status == "completed",
        )
        .order_by(SyncJob.completed_at.desc())
        .limit(1)
    )
    last_job = last_job_result.scalar_one_or_none()

    return {
        "connected": config.is_active,
        "is_active": config.is_active,
        "base_url": config.base_url,
        "last_sync": (
            config.last_successful_sync.isoformat()
            if config.last_successful_sync
            else None
        ),
        "last_job": _job_to_dict(last_job) if last_job else None,
        "sync_options": {
            "sync_accounts": config.sync_accounts,
            "sync_transactions": config.sync_transactions,
            "sync_budgets": config.sync_budgets,
            "sync_bills": config.sync_bills,
            "lookback_days": config.lookback_days,
        },
    }
