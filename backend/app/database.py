import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()

_db_url = settings.sqlalchemy_database_url
connect_args: dict = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}
if (
    os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
    and not _db_url.startswith("sqlite")
    and "sslmode=" not in _db_url
):
    connect_args["sslmode"] = "require"
_engine_kwargs: dict = {"connect_args": connect_args, "pool_pre_ping": True}
if os.environ.get("AWS_LAMBDA_FUNCTION_NAME") and not _db_url.startswith("sqlite"):
    # NullPool: one connection per Lambda invocation; no RDS Proxy required.
    _engine_kwargs["poolclass"] = NullPool
engine = create_engine(_db_url, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
