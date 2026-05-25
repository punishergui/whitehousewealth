from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class AIConversation(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "ai_conversations"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False, default="New Conversation")
    context_snapshot: Mapped[str | None] = mapped_column(Text)  # JSON financial context at time of creation

    # Relationships
    household = relationship("Household", back_populates="ai_conversations")
    user = relationship("User")
    messages: Mapped[list["AIMessage"]] = relationship(
        "AIMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="AIMessage.created_at"
    )


class AIMessage(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "ai_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # role: user, assistant, system
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model_used: Mapped[str | None] = mapped_column(String(100))
    prompt_tokens: Mapped[int | None] = mapped_column()
    completion_tokens: Mapped[int | None] = mapped_column()

    # Relationships
    conversation: Mapped["AIConversation"] = relationship("AIConversation", back_populates="messages")
