from __future__ import annotations

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

from app.config import settings
from app.models.base import Base

# Import all models so they register their tables with Base.metadata
import app.models.account       # noqa: F401
import app.models.transaction   # noqa: F401
import app.models.budget        # noqa: F401
import app.models.goal          # noqa: F401
import app.models.scenario      # noqa: F401
import app.models.fire          # noqa: F401
import app.models.household     # noqa: F401
import app.models.ai            # noqa: F401
import app.models.sync          # noqa: F401
import app.auth.models          # noqa: F401
import app.models.bill          # noqa: F401
import app.models.agent         # noqa: F401

# Alembic Config object — provides access to values from alembic.ini
config = context.config

# Override sqlalchemy.url from our settings so we never store DB creds in ini
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging (if present)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object containing all mapped table definitions
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine.
    Calls to context.execute() emit the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations using an async engine (required for asyncpg)."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connected to the DB)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
