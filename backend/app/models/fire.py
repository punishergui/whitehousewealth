from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class RetirementProfile(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "retirement_profiles"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="Primary Profile")

    # Demographics
    current_age: Mapped[int] = mapped_column(nullable=False, default=35)
    partner_current_age: Mapped[int | None] = mapped_column()
    retirement_age_target: Mapped[int] = mapped_column(nullable=False, default=65)
    partner_retirement_age_target: Mapped[int | None] = mapped_column()
    life_expectancy: Mapped[int] = mapped_column(nullable=False, default=90)

    # Financials
    current_savings: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), nullable=False, default=Decimal("0.00"))
    monthly_contribution: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False, default=Decimal("0.00"))
    employer_match_pct: Mapped[Decimal] = mapped_column(Numeric(precision=5, scale=4), nullable=False, default=Decimal("0.0"))
    expected_return_rate: Mapped[Decimal] = mapped_column(Numeric(precision=6, scale=4), nullable=False, default=Decimal("0.07"))
    inflation_rate: Mapped[Decimal] = mapped_column(Numeric(precision=6, scale=4), nullable=False, default=Decimal("0.03"))

    # Spending targets
    target_annual_spending: Mapped[Decimal] = mapped_column(Numeric(precision=12, scale=2), nullable=False, default=Decimal("60000.00"))
    social_security_estimate: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False, default=Decimal("0.00"))
    other_income: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False, default=Decimal("0.00"))

    # FIRE settings
    # fire_mode: lean, regular, fat, coast, barista
    fire_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="regular")
    withdrawal_rate: Mapped[Decimal] = mapped_column(Numeric(precision=6, scale=4), nullable=False, default=Decimal("0.04"))
    fi_number: Mapped[Decimal | None] = mapped_column(Numeric(precision=15, scale=2))

    # Barista FIRE: part-time income expectation
    barista_income: Mapped[Decimal] = mapped_column(Numeric(precision=10, scale=2), nullable=False, default=Decimal("0.00"))

    # Computed/cached values (updated by background job)
    cached_fi_percentage: Mapped[Decimal | None] = mapped_column(Numeric(precision=6, scale=4))
    cached_fi_date_estimate: Mapped[str | None] = mapped_column(String(20))  # ISO date string
    cached_success_rate: Mapped[Decimal | None] = mapped_column(Numeric(precision=6, scale=4))

    is_primary: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    household = relationship("Household", back_populates="retirement_profiles")
