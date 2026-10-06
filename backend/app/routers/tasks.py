from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.categories import assert_valid_category
from app.database import get_db
from app.goal_links import sync_task_goals
from app.health import normalize_health_task_fields
from app.models import Activity, Task, User, goal_task_link
from app.schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_goals(task: Task) -> tuple[list[int], list[str]]:
    goals = sorted(task.goals or [], key=lambda g: g.id)
    return [g.id for g in goals], [g.title for g in goals]


def _task_out(task: Task, logged_minutes: int = 0, activity_count: int = 0) -> TaskOut:
    goal_ids, goal_titles = _task_goals(task)
    return TaskOut(
        id=task.id,
        user_id=task.user_id,
        title=task.title,
        category=task.category,
        status=task.status,
        notes=task.notes,
        start_date=task.start_date,
        due_date=task.due_date,
        estimate_minutes=task.estimate_minutes,
        health_activity_type=task.health_activity_type,
        health_cardio_type=task.health_cardio_type,
        created_at=task.created_at,
        logged_minutes=logged_minutes,
        activity_count=activity_count,
        goal_ids=goal_ids,
        goal_titles=goal_titles,
    )


def _merge_health_fields(data: dict, task: Task | None) -> None:
    category = data.get("category", task.category if task else None)
    if category is None:
        return
    if "health_activity_type" in data:
        activity_type = data["health_activity_type"]
    elif task is not None:
        activity_type = task.health_activity_type
    else:
        activity_type = None
    if "health_cardio_type" in data:
        cardio_type = data["health_cardio_type"]
    elif task is not None:
        cardio_type = task.health_cardio_type
    else:
        cardio_type = None
    if category != "health":
        data["health_activity_type"] = None
        data["health_cardio_type"] = None
        return
    normalized_activity, normalized_cardio = normalize_health_task_fields(
        category, activity_type, cardio_type
    )
    data["health_activity_type"] = normalized_activity
    data["health_cardio_type"] = normalized_cardio


def _activity_stats(db: Session, user_id: int, task_ids: list[int] | None = None) -> dict[int, tuple[int, int]]:
    """Return {task_id: (logged_minutes, activity_count)} for the user."""
    q = (
        db.query(
            Activity.task_id,
            func.coalesce(func.sum(Activity.duration_minutes), 0),
            func.count(Activity.id),
        )
        .filter(Activity.user_id == user_id, Activity.task_id.isnot(None))
        .group_by(Activity.task_id)
    )
    if task_ids is not None:
        if not task_ids:
            return {}
        q = q.filter(Activity.task_id.in_(task_ids))
    return {row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in q.all()}


@router.get("", response_model=list[TaskOut])
def list_tasks(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    category: Optional[str] = Query(default=None),
    goal_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskOut]:
    q = (
        db.query(Task)
        .options(joinedload(Task.goals))
        .filter(Task.user_id == current_user.id)
    )
    if status_filter:
        q = q.filter(Task.status == status_filter)
    if category:
        q = q.filter(Task.category == category)
    if goal_id is not None:
        q = q.join(goal_task_link).filter(goal_task_link.c.goal_id == goal_id)
    tasks = q.order_by(Task.created_at.desc(), Task.id.desc()).all()
    stats = _activity_stats(db, current_user.id, [t.id for t in tasks])
    return [
        _task_out(task, *stats.get(task.id, (0, 0)))
        for task in tasks
    ]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    data = payload.model_dump()
    goal_ids = data.pop("goal_ids", []) or []
    assert_valid_category(db, current_user.id, data.get("category"))
    _merge_health_fields(data, None)
    task = Task(user_id=current_user.id, **data)
    db.add(task)
    db.flush()
    sync_task_goals(db, task, goal_ids, current_user.id)
    db.commit()
    task = (
        db.query(Task)
        .options(joinedload(Task.goals))
        .filter(Task.id == task.id)
        .first()
    )
    return _task_out(task, 0, 0)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = (
        db.query(Task)
        .options(joinedload(Task.goals))
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    logged, count = _activity_stats(db, current_user.id, [task.id]).get(task.id, (0, 0))
    return _task_out(task, logged, count)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskOut:
    task = (
        db.query(Task)
        .options(joinedload(Task.goals))
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = payload.model_dump(exclude_unset=True)
    goal_ids = updates.pop("goal_ids", None)
    if "category" in updates:
        assert_valid_category(db, current_user.id, updates.get("category"))
    _merge_health_fields(updates, task)
    for key, value in updates.items():
        setattr(task, key, value)
    db.add(task)
    if goal_ids is not None:
        sync_task_goals(db, task, goal_ids, current_user.id)
    elif "category" in updates:
        sync_task_goals(
            db,
            task,
            [g.id for g in (task.goals or []) if g.category == task.category],
            current_user.id,
        )
    # Keep denormalized activity title/category aligned with the parent task
    if "title" in updates or "category" in updates:
        activity_sync = {}
        if "title" in updates:
            activity_sync["title"] = task.title
        if "category" in updates:
            activity_sync["category"] = task.category
        (
            db.query(Activity)
            .filter(Activity.task_id == task.id, Activity.user_id == current_user.id)
            .update(activity_sync, synchronize_session=False)
        )
    db.commit()
    task = (
        db.query(Task)
        .options(joinedload(Task.goals))
        .filter(Task.id == task.id)
        .first()
    )
    logged, count = _activity_stats(db, current_user.id, [task.id]).get(task.id, (0, 0))
    return _task_out(task, logged, count)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
