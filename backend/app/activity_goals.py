"""Validate activity attribution to goals linked on the board task."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Goal, Task, goal_task_link


def validate_activity_goal_id(
    db: Session,
    user_id: int,
    task: Task,
    goal_id: int | None,
) -> None:
    if goal_id is None:
        return
    goal = (
        db.query(Goal)
        .filter(Goal.id == goal_id, Goal.user_id == user_id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    link = db.execute(
        select(goal_task_link.c.task_id).where(
            goal_task_link.c.goal_id == goal_id,
            goal_task_link.c.task_id == task.id,
        )
    ).first()
    if not link:
        raise HTTPException(
            status_code=400,
            detail="Selected goal is not linked to this task",
        )
