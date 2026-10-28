"""Apply schema updates once against DATABASE_URL (Postgres/RDS or local SQLite).

Run before Lambda cutover so cold starts skip DDL. Not used in CI or Docker deploy.

Example (PowerShell, from repo root):

  cd backend
  $env:DATABASE_URL = "postgresql+psycopg2://USER:PASS@host:5432/pulsetrack"
  python scripts/run_postgres_migrations.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow `python scripts/run_postgres_migrations.py` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings
from app.main import apply_database_migrations


def main() -> None:
    settings = get_settings()
    url = settings.sqlalchemy_database_url
    if url.startswith("sqlite"):
        print(f"Target: SQLite ({url})")
    else:
        host_hint = url.split("@")[-1] if "@" in url else url
        print(f"Target: Postgres ({host_hint})")
    apply_database_migrations()
    print("Migrations finished OK.")


if __name__ == "__main__":
    main()
