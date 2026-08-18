from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Activity, Goal, Task, User
from app.schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _task_out(task: Task, logged_minutes: int = 0, activity_count: int = 0) -> TaskOut:
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
        goal_id=task.goal_id,
        created_at=task.created_at,
        logged_minutes=logged_minutes,
        activity_count=activity_count,
        goal_title=task.goal.title if task.goal is not None else None,
    )


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


def _validate_goal_id(db: Session, user_id: int, goal_id: int | None) -> None:
    if goal_id is None:
        return
    goal = (
        db.query(Goal)
        .filter(Goal.id == goal_id, Goal.user_id == user_id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.status != "active":
        raise HTTPException(status_code=400, detail="Can only link tasks to active goals")


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
        .options(joinedload(Task.goal))
        .filter(Task.user_id == current_user.id)
    )
    if status_filter:
        q = q.filter(Task.status == status_filter)
    if category:
        q = q.filter(Task.category == category)
    if goal_id is not None:
        q = q.filter(Task.goal_id == goal_id)
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
    _validate_goal_id(db, current_user.id, data.get("goal_id"))
    task = Task(user_id=current_user.id, **data)
    db.add(task)
    db.commit()
    task = (
        db.query(Task)
        .options(joinedload(Task.goal))
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
        .options(joinedload(Task.goal))
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
        .options(joinedload(Task.goal))
        .filter(Task.id == task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    updates = payload.model_dump(exclude_unset=True)
    if "goal_id" in updates:
        _validate_goal_id(db, current_user.id, updates.get("goal_id"))
    for key, value in updates.items():
        setattr(task, key, value)
    db.add(task)
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
        .options(joinedload(Task.goal))
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
