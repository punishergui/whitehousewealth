from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class Goal(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "goals"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # type: emergency_fund, vacation, purchase, debt_payoff, retirement, custom, sinking_fund
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="custom")
    target_amount: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), default=Decimal("0.00"), nullable=False)
    target_date: Mapped[date | None] = mapped_column(Date)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1=highest
    color: Mapped[str | None] = mapped_column(String(20))
    icon: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # For sinking funds — monthly contribution amount
    monthly_contribution: Mapped[Decimal | None] = mapped_column(Numeric(precision=10, scale=2))
    # Linked account (e.g., HYSA for emergency fund)
    linked_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    household = relationship("Household", back_populates="goals")
    contributions: Mapped[list["GoalContribution"]] = relationship(
        "GoalContribution", back_populates="goal", cascade="all, delete-orphan"
    )

    @property
    def progress_pct(self) -> float:
        if self.target_amount == 0:
            return 0.0
        return min(100.0, float(self.current_amount) / float(self.target_amount) * 100)

    @property
    def remaining_amount(self) -> Decimal:
        return max(Decimal("0.00"), self.target_amount - self.current_amount)


class GoalContribution(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "goal_contributions"

    goal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(500))
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    goal: Mapped["Goal"] = relationship("Goal", back_populates="contributions")
