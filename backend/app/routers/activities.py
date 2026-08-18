from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Activity, Task, User
from app.schemas import ActivityCreate, ActivityOut, ActivityUpdate

router = APIRouter(prefix="/activities", tags=["activities"])


def _activity_out(activity: Activity) -> ActivityOut:
    """Prefer live task title/category so renames stay in sync."""
    title = activity.title
    category = activity.category
    if activity.task is not None:
        title = activity.task.title
        category = activity.task.category
    return ActivityOut(
        id=activity.id,
        user_id=activity.user_id,
        task_id=activity.task_id,
        title=title,
        category=category,
        notes=activity.notes,
        activity_date=activity.activity_date,
        duration_minutes=activity.duration_minutes,
        created_at=activity.created_at,
    )


@router.get("", response_model=list[ActivityOut])
def list_activities(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    task_id: Optional[int] = Query(default=None),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ActivityOut]:
    q = (
        db.query(Activity)
        .options(joinedload(Activity.task))
        .filter(Activity.user_id == current_user.id)
    )
    if start_date:
        q = q.filter(Activity.activity_date >= start_date)
    if end_date:
        q = q.filter(Activity.activity_date <= end_date)
    if task_id:
        q = q.filter(Activity.task_id == task_id)
    if category:
        q = q.filter(Activity.category == category)
    return [
        _activity_out(a)
        for a in q.order_by(Activity.activity_date.desc(), Activity.id.desc()).all()
    ]


@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityOut:
    task = (
        db.query(Task)
        .filter(Task.id == payload.task_id, Task.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Only In Progress tasks can receive activity logs. Move the task to In Progress on the Board first.",
        )

    data = payload.model_dump()
    activity = Activity(
        user_id=current_user.id,
        task_id=task.id,
        title=task.title,
        category=task.category,
        notes=data["notes"],
        activity_date=data["activity_date"],
        duration_minutes=data["duration_minutes"],
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    activity.task = task
    return _activity_out(activity)


@router.get("/{activity_id}", response_model=ActivityOut)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityOut:
    activity = (
        db.query(Activity)
        .options(joinedload(Activity.task))
        .filter(Activity.id == activity_id, Activity.user_id == current_user.id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return _activity_out(activity)


@router.patch("/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: int,
    payload: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityOut:
    activity = (
        db.query(Activity)
        .options(joinedload(Activity.task))
        .filter(Activity.id == activity_id, Activity.user_id == current_user.id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return _activity_out(activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    activity = (
        db.query(Activity)
        .filter(Activity.id == activity_id, Activity.user_id == current_user.id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(activity)
    db.commit()
