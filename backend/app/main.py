from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import engine, get_db
from app.deps import get_current_household, get_current_user
from app.routers import dashboard, family, fire, hermes, money, scenarios, wealth, bills
from app.routers import sync, settings as settings_router, agent as agent_router
from app.auth.router import router as auth_router
from app.auth.models import User
from app.models.household import Household
from app.models.agent import AgentJob


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: alembic handles migrations; nothing special needed here
    yield
    # shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth
app.include_router(auth_router, tags=["auth"])

# Feature routers — each module defines its own prefix internally,
# but we also add a top-level prefix here to namespace the API.
app.include_router(dashboard.router, tags=["dashboard"])
app.include_router(money.router, tags=["money"])
app.include_router(wealth.router, tags=["wealth"])
app.include_router(scenarios.router, tags=["scenarios"])
app.include_router(fire.router, tags=["fire"])
app.include_router(family.router, tags=["family"])
app.include_router(hermes.router, tags=["hermes"])
app.include_router(sync.router, prefix="/sync", tags=["sync"])
app.include_router(settings_router.router, prefix="/settings", tags=["settings"])
app.include_router(bills.router, tags=["bills"])
app.include_router(agent_router.router, prefix="/api", tags=["agent"])


@app.post("/api/sync-ai", tags=["agent"])
async def sync_ai(
    current_user: User = Depends(get_current_user),
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Authenticated user endpoint: creates an agent sync-request job."""
    job = AgentJob(
        household_id=household.id,
        task="all",
        status="pending",
        note="Triggered by user via dashboard",
    )
    db.add(job)
    await db.flush()
    return {"job_id": str(job.id)}


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
