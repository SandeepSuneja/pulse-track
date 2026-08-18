from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Goal, Task, User
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


def _sync_goal_tasks(db: Session, goal: Goal, task_ids: list[int], user_id: int) -> None:
    db.query(Task).filter(Task.user_id == user_id, Task.goal_id == goal.id).update(
        {Task.goal_id: None}, synchronize_session=False
    )
    if not task_ids:
        return
    unique_ids = list(dict.fromkeys(task_ids))
    tasks = (
        db.query(Task)
        .filter(Task.user_id == user_id, Task.id.in_(unique_ids))
        .all()
    )
    found = {t.id for t in tasks}
    missing = [tid for tid in unique_ids if tid not in found]
    if missing:
        raise HTTPException(status_code=404, detail=f"Task(s) not found: {missing}")
    for task in tasks:
        task.goal_id = goal.id
        db.add(task)


def _goal_to_out(goal: Goal) -> GoalOut:
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
        created_at=goal.created_at,
        task_ids=[t.id for t in tasks],
        tasks=[
            GoalTaskBrief(id=t.id, title=t.title, status=t.status, category=t.category)
            for t in tasks
        ],
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
    return [_goal_to_out(g) for g in goals]


@router.post("/goals", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalOut:
    data = payload.model_dump()
    task_ids = data.pop("task_ids", []) or []
    data.pop("is_active", None)
    goal = Goal(user_id=current_user.id, status="active", is_active=1, **data)
    db.add(goal)
    db.flush()
    if task_ids:
        _sync_goal_tasks(db, goal, task_ids, current_user.id)
    db.commit()
    return _goal_to_out(_get_goal(db, goal.id, current_user.id))


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

    if goal.status == "failed":
        raise HTTPException(status_code=400, detail="Failed goals cannot be edited")

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
            if goal.status != "active":
                raise HTTPException(status_code=400, detail="Only active goals can be completed")
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
            raise HTTPException(status_code=400, detail="Cannot reopen a goal as active")
        else:
            raise HTTPException(status_code=400, detail="Invalid goal status")

    if "is_active" in data:
        # Legacy flag — map onto status when status wasn't explicitly set
        active = bool(data.pop("is_active"))
        if active and goal.status != "active":
            raise HTTPException(status_code=400, detail="Cannot reactivate a closed goal")
        if not active and goal.status == "active":
            goal.status = "completed"
            goal.is_active = 0

    # Closed goals: only allow task association tweaks? Prefer block most edits
    if goal.status != "active" and any(
        k in data for k in ("title", "category", "target_minutes", "period", "start_date", "end_date")
    ):
        raise HTTPException(status_code=400, detail="Only active goals can be edited")

    for key, value in data.items():
        setattr(goal, key, value)

    if goal.period == "deadline":
        goal.target_minutes = None
    if goal.target_minutes is not None and goal.period == "deadline":
        goal.period = "weekly"

    _sync_status_flags(goal)
    db.add(goal)

    if task_ids is not None:
        if goal.status != "active":
            raise HTTPException(status_code=400, detail="Cannot change tasks on a closed goal")
        _sync_goal_tasks(db, goal, task_ids, current_user.id)

    db.commit()
    return _goal_to_out(_get_goal(db, goal.id, current_user.id))


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.query(Task).filter(Task.goal_id == goal.id, Task.user_id == current_user.id).update(
        {Task.goal_id: None}, synchronize_session=False
    )
    db.delete(goal)
    db.commit()
