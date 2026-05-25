from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Table, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.household import HouseholdMember


# Association table for user <-> roles
UserRole = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(200))
    permissions: Mapped[str] = mapped_column(String(2000), default="", nullable=False)
    # comma-separated list of permission strings
    # e.g. "read:accounts,write:transactions,admin:household"

    # Relationships
    users: Mapped[list["User"]] = relationship("User", secondary=UserRole, back_populates="roles")


class User(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(30))
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    preferences: Mapped[str | None] = mapped_column(String(5000))  # JSON string

    # Relationships
    roles: Mapped[list["Role"]] = relationship("Role", secondary=UserRole, back_populates="users")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    household_memberships: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="user"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def has_permission(self, permission: str) -> bool:
        for role in self.roles:
            perms = [p.strip() for p in role.permissions.split(",") if p.strip()]
            if permission in perms or "admin:*" in perms:
                return True
        return self.is_superuser


class RefreshToken(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(500))
    ip_address: Mapped[str | None] = mapped_column(String(45))

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")
