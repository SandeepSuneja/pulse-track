from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Activity, Task, User
from app.schemas import ActivityCreate, ActivityOut, ActivityUpdate
from app.sleep import classify_sleep_quality, sleep_duration_minutes

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
        sleep_start_time=activity.sleep_start_time,
        sleep_end_time=activity.sleep_end_time,
        sleep_quality=activity.sleep_quality,
        created_at=activity.created_at,
    )


def _apply_sleep_fields(
    *,
    category: str,
    sleep_start_time,
    sleep_end_time,
    duration_minutes: Optional[int],
) -> tuple[int, object, object, Optional[str]]:
    """Return duration, start, end, quality. Enforces sleep rules for sleep category."""
    if category == "sleep":
        if sleep_start_time is None or sleep_end_time is None:
            raise HTTPException(
                status_code=400,
                detail="Sleep logs require sleep start time and wake-up time.",
            )
        if sleep_start_time == sleep_end_time:
            raise HTTPException(
                status_code=400,
                detail="Wake-up time must differ from sleep start time.",
            )
        minutes = sleep_duration_minutes(sleep_start_time, sleep_end_time)
        if minutes < 1 or minutes > 24 * 60:
            raise HTTPException(
                status_code=400,
                detail="Sleep duration must be between 1 and 1440 minutes.",
            )
        quality = classify_sleep_quality(sleep_start_time, sleep_end_time)
        return minutes, sleep_start_time, sleep_end_time, quality

    return duration_minutes or 0, None, None, None


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
    duration, sleep_start, sleep_end, quality = _apply_sleep_fields(
        category=task.category,
        sleep_start_time=data.get("sleep_start_time"),
        sleep_end_time=data.get("sleep_end_time"),
        duration_minutes=data.get("duration_minutes"),
    )
    if task.category != "sleep" and (duration is None or duration < 1):
        raise HTTPException(status_code=400, detail="Duration must be at least 1 minute.")

    activity = Activity(
        user_id=current_user.id,
        task_id=task.id,
        title=task.title,
        category=task.category,
        notes=data["notes"],
        activity_date=data["activity_date"],
        duration_minutes=duration,
        sleep_start_time=sleep_start,
        sleep_end_time=sleep_end,
        sleep_quality=quality,
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

    data = payload.model_dump(exclude_unset=True)
    category = activity.task.category if activity.task is not None else activity.category

    sleep_touched = "sleep_start_time" in data or "sleep_end_time" in data
    if category == "sleep" or sleep_touched:
        sleep_start = data.get("sleep_start_time", activity.sleep_start_time)
        sleep_end = data.get("sleep_end_time", activity.sleep_end_time)
        duration, sleep_start, sleep_end, quality = _apply_sleep_fields(
            category=category,
            sleep_start_time=sleep_start,
            sleep_end_time=sleep_end,
            duration_minutes=data.get("duration_minutes", activity.duration_minutes),
        )
        activity.duration_minutes = duration
        activity.sleep_start_time = sleep_start
        activity.sleep_end_time = sleep_end
        activity.sleep_quality = quality
        data.pop("duration_minutes", None)
        data.pop("sleep_start_time", None)
        data.pop("sleep_end_time", None)

    for key, value in data.items():
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
