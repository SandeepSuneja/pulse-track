from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import EffortLog, Goal, User
from app.schemas import (
    EffortLogCreate,
    EffortLogOut,
    GoalCreate,
    GoalOut,
    GoalUpdate,
)

router = APIRouter(tags=["goals-effort"])


def _goal_to_out(goal: Goal) -> GoalOut:
    return GoalOut(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        category=goal.category,
        target_minutes=goal.target_minutes,
        period=goal.period,
        start_date=goal.start_date,
        end_date=goal.end_date,
        is_active=bool(goal.is_active),
        created_at=goal.created_at,
    )


@router.get("/goals", response_model=list[GoalOut])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GoalOut]:
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == current_user.id)
        .order_by(Goal.is_active.desc(), Goal.start_date.desc())
        .all()
    )
    return [_goal_to_out(g) for g in goals]


@router.post("/goals", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalOut:
    data = payload.model_dump()
    data["is_active"] = 1 if data.pop("is_active", True) else 0
    goal = Goal(user_id=current_user.id, **data)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _goal_to_out(goal)


@router.patch("/goals/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalOut:
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    data = payload.model_dump(exclude_unset=True)
    if "is_active" in data:
        data["is_active"] = 1 if data["is_active"] else 0
    for key, value in data.items():
        setattr(goal, key, value)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _goal_to_out(goal)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()


@router.get("/effort", response_model=list[EffortLogOut])
def list_effort(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EffortLog]:
    return (
        db.query(EffortLog)
        .filter(EffortLog.user_id == current_user.id)
        .order_by(EffortLog.log_date.desc())
        .limit(90)
        .all()
    )


@router.post("/effort", response_model=EffortLogOut, status_code=status.HTTP_201_CREATED)
def upsert_effort(
    payload: EffortLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EffortLog:
    existing = (
        db.query(EffortLog)
        .filter(EffortLog.user_id == current_user.id, EffortLog.log_date == payload.log_date)
        .first()
    )
    if existing:
        for key, value in payload.model_dump().items():
            setattr(existing, key, value)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    log = EffortLog(user_id=current_user.id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
