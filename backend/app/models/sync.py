from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class SyncJob(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "sync_jobs"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # status: pending, running, completed, failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # type: full, delta, accounts, transactions, budgets
    type: Mapped[str] = mapped_column(String(30), nullable=False, default="delta")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    records_synced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)
    triggered_by: Mapped[str] = mapped_column(String(50), nullable=False, default="scheduler")
    # "scheduler" | "user" | "webhook"

    # Relationships
    household = relationship("Household", back_populates="sync_jobs")


class FireflyConfig(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "firefly_configs"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    pat_token: Mapped[str] = mapped_column(Text, nullable=False)  # Should be encrypted at rest
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_successful_sync: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sync_accounts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sync_transactions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sync_budgets: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sync_bills: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    lookback_days: Mapped[int] = mapped_column(Integer, default=90, nullable=False)

    # Relationships
    household = relationship("Household")
