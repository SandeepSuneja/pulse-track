from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Activity, User
from app.schemas import ActivityCreate, ActivityOut, ActivityUpdate

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("", response_model=list[ActivityOut])
def list_activities(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    category: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Activity]:
    q = db.query(Activity).filter(Activity.user_id == current_user.id)
    if start_date:
        q = q.filter(Activity.activity_date >= start_date)
    if end_date:
        q = q.filter(Activity.activity_date <= end_date)
    if category:
        q = q.filter(Activity.category == category)
    if status_filter:
        q = q.filter(Activity.status == status_filter)
    return q.order_by(Activity.activity_date.desc(), Activity.id.desc()).all()


@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Activity:
    activity = Activity(user_id=current_user.id, **payload.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.get("/{activity_id}", response_model=ActivityOut)
def get_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Activity:
    activity = (
        db.query(Activity)
        .filter(Activity.id == activity_id, Activity.user_id == current_user.id)
        .first()
    )
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


@router.patch("/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: int,
    payload: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Activity:
    activity = (
        db.query(Activity)
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
    return activity


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
