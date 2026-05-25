from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.ai import AIConversation, AIMessage
from app.models.household import Household
from app.services.ai_service import ai_service
from app.services.dashboard_service import get_command_center_data

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
    """Send a message to Hermes and get a response."""
    # Get or create conversation
    if body.conversation_id:
        result = await db.execute(
            select(AIConversation)
            .where(
                AIConversation.id == body.conversation_id,
                AIConversation.household_id == household.id,
            )
            .options(selectinload(AIConversation.messages))
        )
        conv = result.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = AIConversation(
            household_id=household.id,
            user_id=current_user.id,
            title=body.message[:60] + ("..." if len(body.message) > 60 else ""),
        )
        db.add(conv)
        await db.flush()
        await db.refresh(conv, ["messages"])

    # Gather financial context
    try:
        context = await get_command_center_data(db, household.id)
        context["household_name"] = household.name
    except Exception:
        context = {"household_name": household.name}

    # Build message history for AI
    history = [
        {"role": m.role, "content": m.content}
        for m in conv.messages
        if m.role in ("user", "assistant")
    ]
    history.append({"role": "user", "content": body.message})

    # Persist user message
    user_msg = AIMessage(
        conversation_id=conv.id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    await db.flush()

    # Get AI response
    try:
        reply = await ai_service.chat(
            messages=history,
            context=context,
            household_name=household.name,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(exc)}",
        )

    # Persist assistant message
    from app.config import settings
    assistant_msg = AIMessage(
        conversation_id=conv.id,
        role="assistant",
        content=reply,
        model_used=settings.ANTHROPIC_MODEL if settings.AI_PROVIDER == "anthropic" else settings.OPENAI_MODEL,
    )
    db.add(assistant_msg)
    await db.flush()

    return {
        "conversation_id": str(conv.id),
        "message_id": str(assistant_msg.id),
        "reply": reply,
        "model": assistant_msg.model_used,
    }


@router.get("/briefing")
async def get_daily_briefing(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get Hermes daily financial briefing."""
    try:
        context = await get_command_center_data(db, household.id)
        context["household_name"] = household.name
        briefing = await ai_service.get_financial_briefing(context)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI service error: {str(exc)}",
        )
    return {"briefing": briefing, "household_name": household.name}


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
