from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "whwos",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "sync-firefly-every-15-minutes": {
            "task": "app.workers.tasks.sync_firefly",
            "schedule": settings.SYNC_INTERVAL_MINUTES * 60,
        },
    },
)
