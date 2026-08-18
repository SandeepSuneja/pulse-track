from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth import init_firebase
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import Activity, Task
from app.routers import activities, analytics, goals, tasks, users


def ensure_sqlite_schema() -> None:
    """Create/alter tables and migrate legacy board-as-activity rows into tasks + logs."""
    with engine.begin() as conn:
        # Legacy category cleanup on goals
        goal_info = conn.execute(text("PRAGMA table_info(goals)")).fetchall()
        goal_cols = {row[1] for row in goal_info}
        if goal_cols:
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
            # Allow null target_minutes (deadline goals) and optional start_date
            by_name = {row[1]: row for row in goal_info}
            needs_goals_rebuild = False
            if by_name.get("target_minutes") and by_name["target_minutes"][3] == 1:
                needs_goals_rebuild = True
            if by_name.get("start_date") and by_name["start_date"][3] == 1:
                needs_goals_rebuild = True
            if needs_goals_rebuild:
                conn.execute(
                    text(
                        "CREATE TABLE goals_new ("
                        "id INTEGER NOT NULL PRIMARY KEY, "
                        "user_id INTEGER NOT NULL, "
                        "title VARCHAR(200) NOT NULL, "
                        "category VARCHAR(80) NOT NULL, "
                        "target_minutes INTEGER, "
                        "period VARCHAR(20) NOT NULL, "
                        "start_date DATE, "
                        "end_date DATE, "
                        "is_active INTEGER NOT NULL, "
                        "created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL, "
                        "FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE"
                        ")"
                    )
                )
                conn.execute(
                    text(
                        "INSERT INTO goals_new "
                        "(id, user_id, title, category, target_minutes, period, "
                        "start_date, end_date, is_active, created_at) "
                        "SELECT id, user_id, title, category, target_minutes, period, "
                        "start_date, end_date, is_active, created_at FROM goals"
                    )
                )
                conn.execute(text("DROP TABLE goals"))
                conn.execute(text("ALTER TABLE goals_new RENAME TO goals"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_goals_user_id ON goals (user_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_goals_category ON goals (category)"))

        task_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(tasks)")).fetchall()}
        if task_cols and "start_date" not in task_cols:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN start_date DATE"))
        if task_cols and "goal_id" not in task_cols:
            conn.execute(
                text("ALTER TABLE tasks ADD COLUMN goal_id INTEGER REFERENCES goals(id)")
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tasks_goal_id ON tasks (goal_id)"))

        # Refresh goal columns after possible rebuild
        goal_info = conn.execute(text("PRAGMA table_info(goals)")).fetchall()
        goal_cols = {row[1] for row in goal_info}
        if goal_cols and "status" not in goal_cols:
            conn.execute(
                text("ALTER TABLE goals ADD COLUMN status VARCHAR(20) DEFAULT 'active'")
            )
            conn.execute(
                text(
                    "UPDATE goals SET status = CASE "
                    "WHEN is_active = 1 THEN 'active' ELSE 'completed' END"
                )
            )
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_goals_status ON goals (status)"))

        activity_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(activities)")).fetchall()
        }
        if not activity_cols:
            return

        if "task_id" not in activity_cols:
            conn.execute(text("ALTER TABLE activities ADD COLUMN task_id INTEGER REFERENCES tasks(id)"))

        # Normalize categories on activities if column still present
        if "category" in activity_cols:
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

    # Re-read columns after possible ALTER
    with engine.connect() as conn:
        activity_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(activities)")).fetchall()
        }

    status_expr = "COALESCE(status, 'todo')" if "status" in activity_cols else "'todo'"
    due_expr = "due_date" if "due_date" in activity_cols else "NULL"
    select_sql = (
        "SELECT title, category, notes, duration_minutes, "
        f"{status_expr} AS status, {due_expr} AS due_date "
        "FROM activities WHERE id = :id"
    )

    db = SessionLocal()
    try:
        orphans = db.query(Activity).filter(Activity.task_id.is_(None)).all()
        if orphans:
            with engine.connect() as conn:
                for activity in orphans:
                    row = conn.execute(text(select_sql), {"id": activity.id}).mappings().first()
                    if not row:
                        continue
                    category = row["category"] or "others"
                    if category not in {
                        "health",
                        "learning",
                        "work",
                        "sleep",
                        "entertainment",
                        "personal_technical_projects",
                        "ai_content_generation",
                        "others",
                    }:
                        category = "others"
                    status = row["status"] or "todo"
                    if status not in {"todo", "in_progress", "completed"}:
                        status = "todo"

                    task = Task(
                        user_id=activity.user_id,
                        title=row["title"] or "Untitled task",
                        category=category,
                        status=status,
                        notes=row["notes"] or "",
                        due_date=row["due_date"],
                        estimate_minutes=max(1, int(row["duration_minutes"] or 60)),
                    )
                    db.add(task)
                    db.flush()
                    activity.task_id = task.id
                    activity.title = task.title
                    activity.category = task.category
            db.commit()

        # Repair stale denormalized title/category copied onto activity logs
        db.execute(
            text(
                "UPDATE activities SET "
                "title = (SELECT title FROM tasks WHERE tasks.id = activities.task_id), "
                "category = (SELECT category FROM tasks WHERE tasks.id = activities.task_id) "
                "WHERE task_id IS NOT NULL"
            )
        )
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    Base.metadata.create_all(bind=engine)
    if settings.sqlalchemy_database_url.startswith("sqlite"):
        ensure_sqlite_schema()
    try:
        init_firebase(settings)
    except RuntimeError:
        if not settings.dev_skip_auth:
            raise
    yield


app = FastAPI(
    title="Pulse Track API",
    description="Personal activity tracking, goals, and analytics.",
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
app.include_router(tasks.router, prefix="/api")
app.include_router(activities.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "pulse-track"}
