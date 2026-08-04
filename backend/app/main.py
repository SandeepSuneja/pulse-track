from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth import init_firebase
from app.config import get_settings
from app.database import Base, engine
from app.routers import activities, analytics, goals, users


def ensure_sqlite_columns() -> None:
    """Add columns introduced after initial create_all (SQLite has no ALTER via ORM)."""
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(activities)")).fetchall()
        names = {row[1] for row in rows}
        if "status" not in names:
            conn.execute(
                text(
                    "ALTER TABLE activities ADD COLUMN status VARCHAR(20) "
                    "NOT NULL DEFAULT 'todo'"
                )
            )
        if "due_date" not in names:
            conn.execute(text("ALTER TABLE activities ADD COLUMN due_date DATE"))
        # Normalize legacy category values to the new set
        conn.execute(
            text(
                "UPDATE activities SET category = CASE category "
                "WHEN 'personal' THEN 'others' "
                "WHEN 'deep_work' THEN 'work' "
                "WHEN 'admin' THEN 'others' "
                "WHEN 'other' THEN 'others' "
                "ELSE category END"
            )
        )
        conn.execute(
            text(
                "UPDATE goals SET category = CASE category "
                "WHEN 'personal' THEN 'others' "
                "WHEN 'deep_work' THEN 'work' "
                "WHEN 'admin' THEN 'others' "
                "WHEN 'other' THEN 'others' "
                "ELSE category END"
            )
        )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    Base.metadata.create_all(bind=engine)
    if settings.database_url.startswith("sqlite"):
        ensure_sqlite_columns()
    try:
        init_firebase(settings)
    except RuntimeError:
        # Startup continues; protected routes will fail clearly until Firebase is configured
        # or DEV_SKIP_AUTH=true is set.
        if not settings.dev_skip_auth:
            raise
    yield


app = FastAPI(
    title="Pulse Track API",
    description="Personal activity tracking, goals, and effort analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(activities.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "pulse-track"}
