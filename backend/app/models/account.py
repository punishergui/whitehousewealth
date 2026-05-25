from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.household import Household
    from app.models.transaction import Transaction


class Account(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "accounts"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    firefly_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # type: checking, savings, credit, loan, investment, asset, mortgage
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    institution: Mapped[str | None] = mapped_column(String(200))
    balance: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    color: Mapped[str | None] = mapped_column(String(20))
    icon: Mapped[str | None] = mapped_column(String(50))
    # For credit/loans: APR, promo expiry, minimum payment
    apr: Mapped[Decimal | None] = mapped_column(Numeric(precision=6, scale=4))
    promo_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    minimum_payment: Mapped[Decimal | None] = mapped_column(Numeric(precision=10, scale=2))
    credit_limit: Mapped[Decimal | None] = mapped_column(Numeric(precision=15, scale=2))
    notes: Mapped[str | None] = mapped_column(Text)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    household: Mapped["Household"] = relationship("Household", back_populates="accounts")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="account")


class Asset(UUIDPrimaryKey, TimestampMixin, Base):
    """Physical and other non-account assets (home, car, collectibles)."""

    __tablename__ = "assets"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # type: real_estate, vehicle, business, collectible, other
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="other")
    estimated_value: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), nullable=False)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(precision=15, scale=2))
    purchase_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_valued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    household = relationship("Household")


class Liability(UUIDPrimaryKey, TimestampMixin, Base):
    """Tracks structured liabilities linked to accounts."""

    __tablename__ = "liabilities"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # type: mortgage, auto, student, personal, credit_card, medical, other
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    original_balance: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), nullable=False)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), nullable=False)
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(precision=6, scale=4))
    monthly_payment: Mapped[Decimal | None] = mapped_column(Numeric(precision=10, scale=2))
    due_date: Mapped[int | None] = mapped_column()  # day of month
    origination_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payoff_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    household = relationship("Household")
    account: Mapped["Account | None"] = relationship("Account")
