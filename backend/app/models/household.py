from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.auth.models import User


class Household(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "households"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    timezone: Mapped[str] = mapped_column(String(60), default="America/Chicago", nullable=False)
    fiscal_year_start_month: Mapped[int] = mapped_column(default=1, nullable=False)

    # Relationships
    members: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="household", cascade="all, delete-orphan"
    )
    accounts: Mapped[list] = relationship("Account", back_populates="household")
    transactions: Mapped[list] = relationship("Transaction", back_populates="household")
    categories: Mapped[list] = relationship("Category", back_populates="household")
    budgets: Mapped[list] = relationship("Budget", back_populates="household")
    goals: Mapped[list] = relationship("Goal", back_populates="household")
    scenarios: Mapped[list] = relationship("Scenario", back_populates="household")
    retirement_profiles: Mapped[list] = relationship("RetirementProfile", back_populates="household")
    ai_conversations: Mapped[list] = relationship("AIConversation", back_populates="household")
    sync_jobs: Mapped[list] = relationship("SyncJob", back_populates="household")


class HouseholdMember(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "household_members"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), default="member", nullable=False)
    # roles: owner, admin, member, viewer
    display_name: Mapped[str | None] = mapped_column(String(100))
    is_primary: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relationships
    household: Mapped["Household"] = relationship("Household", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="household_memberships")
