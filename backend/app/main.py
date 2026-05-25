from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.routers import dashboard, family, fire, hermes, money, scenarios, wealth, bills, agent
from app.routers import sync, settings as settings_router
from app.auth.router import router as auth_router


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
app.include_router(agent.router, prefix="/api", tags=["agent"])


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
