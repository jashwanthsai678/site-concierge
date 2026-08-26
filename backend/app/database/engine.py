from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.config.settings import get_settings

# Importing app.models (not just app.models.base) registers every mapped
# class on Base.metadata before create_all_tables() runs below.
from app import models  # noqa: F401
from app.models.base import Base


def build_engine() -> AsyncEngine:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)

    if engine.dialect.name == "sqlite":
        # Foreign keys are off by default in SQLite; WAL improves concurrent
        # read/write behavior for the async web server + seed script.
        @event.listens_for(engine.sync_engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    return engine


engine = build_engine()


async def create_all_tables() -> None:
    # MVP uses metadata.create_all + an idempotent seed script rather than
    # Alembic migrations — see plan: not worth the tooling investment before
    # the schema stabilizes.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

