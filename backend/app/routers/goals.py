from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.categories import assert_valid_category
from app.database import get_db
from app.goal_links import sync_goal_tasks
from app.goal_time import logged_minutes_for_goals
from app.models import Goal, User
from app.schemas import GoalCreate, GoalOut, GoalTaskBrief, GoalUpdate

router = APIRouter(tags=["goals"])

GOAL_STATUSES = {"active", "completed", "failed"}


def _sync_status_flags(goal: Goal) -> None:
    if goal.status not in GOAL_STATUSES:
        goal.status = "active"
    goal.is_active = 1 if goal.status == "active" else 0


def _expire_overdue_goals(db: Session, user_id: int) -> None:
    """Mark active deadline goals past their due date as failed."""
    today = date.today()
    overdue = (
        db.query(Goal)
        .filter(
            Goal.user_id == user_id,
            Goal.status == "active",
            Goal.end_date.isnot(None),
            Goal.end_date < today,
        )
        .all()
    )
    if not overdue:
        return
    for goal in overdue:
        goal.status = "failed"
        goal.is_active = 0
        db.add(goal)
    db.commit()


def _goal_to_out(goal: Goal, logged_minutes: int = 0) -> GoalOut:
    tasks = sorted(goal.tasks or [], key=lambda t: t.id)
    return GoalOut(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        category=goal.category,
        target_minutes=goal.target_minutes,
        period=goal.period,
        start_date=goal.start_date,
        end_date=goal.end_date,
        status=goal.status or ("active" if goal.is_active else "completed"),
        is_active=bool(goal.is_active),
        completion_pct=max(0, min(int(goal.completion_pct or 0), 100)),
        created_at=goal.created_at,
        task_ids=[t.id for t in tasks],
        tasks=[
            GoalTaskBrief(id=t.id, title=t.title, status=t.status, category=t.category)
            for t in tasks
        ],
        logged_minutes=logged_minutes,
    )


def _get_goal(db: Session, goal_id: int, user_id: int) -> Goal:
    goal = (
        db.query(Goal)
        .options(joinedload(Goal.tasks))
        .filter(Goal.id == goal_id, Goal.user_id == user_id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.get("/goals", response_model=list[GoalOut])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[GoalOut]:
    _expire_overdue_goals(db, current_user.id)
    goals = (
        db.query(Goal)
        .options(joinedload(Goal.tasks))
        .filter(Goal.user_id == current_user.id)
        .order_by(Goal.is_active.desc(), Goal.start_date.desc())
        .all()
    )
    minutes_by_id = logged_minutes_for_goals(db, current_user.id, goals)
    return [_goal_to_out(g, minutes_by_id.get(g.id, 0)) for g in goals]


@router.post("/goals", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalOut:
    data = payload.model_dump()
    task_ids = data.pop("task_ids", []) or []
    data.pop("is_active", None)
    assert_valid_category(db, current_user.id, data.get("category"))
    goal = Goal(user_id=current_user.id, status="active", is_active=1, **data)
    db.add(goal)
    db.flush()
    if task_ids:
        sync_goal_tasks(db, goal, task_ids, current_user.id)
    db.commit()
    goal = _get_goal(db, goal.id, current_user.id)
    mins = logged_minutes_for_goals(db, current_user.id, [goal]).get(goal.id, 0)
    return _goal_to_out(goal, mins)


@router.patch("/goals/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalOut:
    _expire_overdue_goals(db, current_user.id)
    goal = _get_goal(db, goal_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    task_ids = data.pop("task_ids", None)

    if "end_date" in data:
        if goal.end_date is not None and data["end_date"] != goal.end_date:
            raise HTTPException(
                status_code=400,
                detail="Due date cannot be changed once it is set",
            )
        if goal.end_date is not None and data["end_date"] is None:
            raise HTTPException(
                status_code=400,
                detail="Due date cannot be removed once it is set",
            )

    if "status" in data:
        new_status = data["status"]
        if new_status == "completed":
            if goal.status == "active":
                goal.completion_pct = 100
            goal.status = "completed"
            goal.is_active = 0
            data.pop("status")
            data.pop("is_active", None)
        elif new_status == "failed":
            goal.status = "failed"
            goal.is_active = 0
            data.pop("status")
            data.pop("is_active", None)
        elif new_status == "active":
            goal.status = "active"
            goal.is_active = 1
            data.pop("status")
            data.pop("is_active", None)
        else:
            raise HTTPException(status_code=400, detail="Invalid goal status")

    if "is_active" in data:
        active = bool(data.pop("is_active"))
        goal.status = "active" if active else "completed"
        goal.is_active = 1 if active else 0

    if "category" in data:
        assert_valid_category(db, current_user.id, data.get("category"))

    for key, value in data.items():
        setattr(goal, key, value)

    if goal.period == "deadline":
        goal.target_minutes = None
    if goal.target_minutes is not None and goal.period == "deadline":
        goal.period = "weekly"

    _sync_status_flags(goal)
    db.add(goal)

    if task_ids is not None:
        sync_goal_tasks(db, goal, task_ids, current_user.id)

    db.commit()
    goal = _get_goal(db, goal.id, current_user.id)
    mins = logged_minutes_for_goals(db, current_user.id, [goal]).get(goal.id, 0)
    return _goal_to_out(goal, mins)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    _sync_status_flags(goal)
    if goal.status in ("failed", "completed"):
        raise HTTPException(
            status_code=400,
            detail="Completed and failed goals cannot be deleted",
        )
    db.delete(goal)
    db.commit()
