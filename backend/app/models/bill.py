from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class Bill(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "bills"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False)
    due_day_of_month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1–31
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="General")
    icon: Mapped[str | None] = mapped_column(String(50))
    auto_pay: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    last_paid_date: Mapped[date | None] = mapped_column(Date)

    household = relationship("Household", back_populates="bills")
    account = relationship("Account")
