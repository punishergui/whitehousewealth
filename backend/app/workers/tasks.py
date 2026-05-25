from __future__ import annotations

import asyncio
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.sync_firefly", bind=True, max_retries=3)
def sync_firefly(self):
    """
    Scheduled Firefly III sync task.
    Syncs all active households that have a Firefly config.
    """
    try:
        asyncio.run(_run_all_household_syncs())
        logger.info("Firefly sync completed successfully")
    except Exception as exc:
        logger.error(f"Firefly sync failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


async def _run_all_household_syncs() -> None:
    """Async runner: sync every household that has an active Firefly config."""
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

    from app.config import settings
    from app.models.sync import FireflyConfig
    from app.services.firefly_sync import run_household_sync

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(
            select(FireflyConfig).where(FireflyConfig.is_active == True)
        )
        configs = result.scalars().all()

        for config in configs:
            try:
                async with async_session() as session:
                    async with session.begin():
                        job = await run_household_sync(session, config.household_id, sync_type="delta")
                        logger.info(
                            f"Synced household {config.household_id}: "
                            f"{job.records_synced} records, status={job.status}"
                        )
            except Exception as exc:
                logger.error(f"Failed to sync household {config.household_id}: {exc}")

    await engine.dispose()


@celery_app.task(name="app.workers.tasks.generate_ai_briefing")
def generate_ai_briefing(household_id: str):
    """
    Generate the daily Hermes AI financial briefing for a household.
    household_id: str UUID of the household.
    """
    try:
        asyncio.run(_run_briefing(household_id))
    except Exception as exc:
        logger.error(f"AI briefing generation failed for household {household_id}: {exc}")


async def _run_briefing(household_id: str) -> None:
    """Async runner for Hermes daily briefing generation."""
    import uuid as _uuid
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

    from app.config import settings
    from app.services.ai_service import ai_service
    from app.services.dashboard_service import get_command_center_data

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    hh_id = _uuid.UUID(household_id)

    async with async_session() as db:
        data = await get_command_center_data(db, hh_id)
        briefing = await ai_service.get_financial_briefing(data)
        logger.info(f"Daily briefing generated for household {household_id} ({len(briefing)} chars)")

    await engine.dispose()
