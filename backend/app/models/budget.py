from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class Budget(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "budgets"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), nullable=False)
    # period: monthly, weekly, yearly, biweekly
    period: Mapped[str] = mapped_column(String(20), nullable=False, default="monthly")
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    rollover: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    color: Mapped[str | None] = mapped_column(String(20))
    firefly_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    household = relationship("Household", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
    periods: Mapped[list["BudgetPeriod"]] = relationship(
        "BudgetPeriod", back_populates="budget", cascade="all, delete-orphan"
    )


class BudgetPeriod(UUIDPrimaryKey, TimestampMixin, Base):
    """Tracks actual spending vs budget for a specific period."""

    __tablename__ = "budget_periods"

    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    budgeted_amount: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), nullable=False)
    spent_amount: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), default=Decimal("0.00"), nullable=False)
    rolled_over_amount: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), default=Decimal("0.00"), nullable=False)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    budget: Mapped["Budget"] = relationship("Budget", back_populates="periods")

    @property
    def remaining(self) -> Decimal:
        return self.budgeted_amount + self.rolled_over_amount - self.spent_amount

    @property
    def utilization_pct(self) -> float:
        total = float(self.budgeted_amount + self.rolled_over_amount)
        if total == 0:
            return 0.0
        return float(self.spent_amount) / total * 100
