"""Copy local SQLite rows into PostgreSQL (RDS), preserving IDs.

Usage (from backend/):

    python scripts/copy_sqlite_to_postgres.py --replace

Reads SQLITE_PATH (default: ./pulse_track.db) and DATABASE_URL.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import Settings  # noqa: E402
from app.models import Activity, Goal, Task, User  # noqa: E402

TABLES = ("users", "goals", "tasks", "activities")
MODELS = (User, Goal, Task, Activity)


def _pg_url(url: str) -> str:
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg2://" + url[len(prefix) :]
    return url


def _row_kwargs(model, source) -> dict:
    cols = {c.name for c in model.__table__.columns}
    data = {}
    for key in cols:
        data[key] = getattr(source, key)
    return data


def copy_data(*, sqlite_url: str, postgres_url: str, replace: bool) -> None:
    src_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    dst_engine = create_engine(_pg_url(postgres_url))
    Src = sessionmaker(bind=src_engine)
    Dst = sessionmaker(bind=dst_engine)
    src = Src()
    dst = Dst()

    try:
        src_counts = {name: src.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar() for name in TABLES}
        print("SQLite source:", src_counts)

        if replace:
            dst.execute(text("TRUNCATE TABLE activities, tasks, goals, users RESTART IDENTITY CASCADE"))
            dst.commit()
            print("Postgres: truncated existing rows")

        existing = {name: dst.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar() for name in TABLES}
        if any(existing.values()) and not replace:
            raise SystemExit(
                f"Postgres already has data {existing}. Re-run with --replace to overwrite."
            )

        for model in MODELS:
            rows = src.query(model).order_by(model.id).all()
            for row in rows:
                dst.merge(model(**_row_kwargs(model, row)))
            dst.commit()
            print(f"Copied {len(rows)} {model.__tablename__}")

        for name in TABLES:
            max_id = dst.execute(text(f"SELECT COALESCE(MAX(id), 1) FROM {name}")).scalar()
            dst.execute(text(f"SELECT setval(pg_get_serial_sequence('{name}', 'id'), :v, true)"), {"v": max_id})
        dst.commit()

        dst_counts = {name: dst.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar() for name in TABLES}
        print("Postgres after copy:", dst_counts)
        if dst_counts != src_counts:
            raise SystemExit("Row counts do not match. Check the log above.")
        print("Copy complete.")
    finally:
        src.close()
        dst.close()
        src_engine.dispose()
        dst_engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Copy pulse_track.db into RDS PostgreSQL")
    parser.add_argument("--replace", action="store_true", help="Wipe existing Postgres rows first")
    parser.add_argument(
        "--sqlite",
        default=os.environ.get("SQLITE_PATH", str(BACKEND_DIR / "pulse_track.db")),
    )
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite)
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite file not found: {sqlite_path}")

    database_url = os.environ.get("DATABASE_URL") or Settings().database_url
    if database_url.startswith("sqlite"):
        raise SystemExit("DATABASE_URL is still SQLite. Set it to the RDS URL before running.")

    copy_data(
        sqlite_url=f"sqlite:///{sqlite_path.as_posix()}",
        postgres_url=database_url,
        replace=args.replace,
    )


if __name__ == "__main__":
    main()
