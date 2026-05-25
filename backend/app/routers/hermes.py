from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.agent import AgentBriefing
from app.models.ai import AIConversation, AIMessage
from app.models.household import Household

router = APIRouter(prefix="/hermes", tags=["hermes"])


class ChatRequest(BaseModel):
    message: str = Field(max_length=4000)
    conversation_id: uuid.UUID | None = None


class ConversationCreate(BaseModel):
    title: str = Field(default="New Conversation", max_length=300)


@router.get("/conversations")
async def list_conversations(
    household: Household = Depends(get_current_household),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(AIConversation)
        .where(
            AIConversation.household_id == household.id,
            AIConversation.user_id == current_user.id,
        )
        .order_by(AIConversation.created_at.desc())
        .limit(50)
    )
    conversations = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "title": c.title,
            "created_at": c.created_at.isoformat(),
        }
        for c in conversations
    ]


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    household: Household = Depends(get_current_household),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    conv = AIConversation(
        household_id=household.id,
        user_id=current_user.id,
        title=body.title,
    )
    db.add(conv)
    await db.flush()
    return {"id": str(conv.id), "title": conv.title, "created_at": conv.created_at.isoformat()}


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(AIConversation)
        .where(
            AIConversation.id == conversation_id,
            AIConversation.household_id == household.id,
        )
        .options(selectinload(AIConversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "id": str(conv.id),
        "title": conv.title,
        "messages": [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "model_used": m.model_used,
                "created_at": m.created_at.isoformat(),
            }
            for m in conv.messages
        ],
        "created_at": conv.created_at.isoformat(),
    }


@router.post("/chat")
async def chat(
    body: ChatRequest,
    household: Household = Depends(get_current_household),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Chat is handled by the external Hermes agent via the Agent API."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Chat inference is handled by the external Hermes agent. Use the Agent API.",
    )


@router.get("/briefing")
async def get_daily_briefing(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the latest briefing written by the Hermes agent."""
    result = await db.execute(
        select(AgentBriefing)
        .where(AgentBriefing.household_id == household.id)
        .order_by(AgentBriefing.for_date.desc(), AgentBriefing.created_at.desc())
        .limit(1)
    )
    briefing = result.scalar_one_or_none()
    if not briefing:
        return {
            "briefing": "No briefing available yet. The Hermes agent will post one soon.",
            "title": "",
            "for_date": None,
            "household_name": household.name,
        }
    return {
        "briefing": briefing.body,
        "title": briefing.title,
        "for_date": briefing.for_date.isoformat() if briefing.for_date else None,
        "household_name": household.name,
    }


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(AIConversation).where(
            AIConversation.id == conversation_id,
            AIConversation.household_id == household.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
