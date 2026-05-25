from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Table,
    Text,
    Column,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.account import Account
    from app.models.household import Household


# Association table for transaction <-> tags
TransactionTag = Table(
    "transaction_tags",
    Base.metadata,
    Column("transaction_id", UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Category(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "categories"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20))
    icon: Mapped[str | None] = mapped_column(String(50))
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    firefly_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    household: Mapped["Household"] = relationship("Household", back_populates="categories")
    parent: Mapped["Category | None"] = relationship("Category", remote_side="Category.id")
    children: Mapped[list["Category"]] = relationship("Category", back_populates="parent", foreign_keys=[parent_id])
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="category")
    budgets: Mapped[list] = relationship("Budget", back_populates="category")


class Tag(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "tags"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20))

    # Relationships
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", secondary=TransactionTag, back_populates="tags"
    )


class Transaction(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "transactions"

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    firefly_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(precision=15, scale=2), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    merchant_name: Mapped[str | None] = mapped_column(String(200))
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # type: income, expense, transfer
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="expense")
    # status: pending, cleared, reconciled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="cleared")
    notes: Mapped[str | None] = mapped_column(Text)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    transfer_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    account: Mapped["Account"] = relationship("Account", back_populates="transactions", foreign_keys=[account_id])
    household: Mapped["Household"] = relationship("Household", back_populates="transactions")
    category: Mapped["Category | None"] = relationship("Category", back_populates="transactions")
    tags: Mapped[list["Tag"]] = relationship("Tag", secondary=TransactionTag, back_populates="transactions")
