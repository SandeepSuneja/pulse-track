"""Links between goals and board tasks: many goals per task, one task per goal."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import delete, insert
from sqlalchemy.orm import Session

from app.models import Goal, Task, goal_task_link


def sync_goal_tasks(db: Session, goal: Goal, task_ids: list[int], user_id: int) -> None:
    """Set the single board task linked to this goal (or none)."""
    db.execute(delete(goal_task_link).where(goal_task_link.c.goal_id == goal.id))
    if not task_ids:
        return
    unique_ids = list(dict.fromkeys(task_ids))
    if len(unique_ids) > 1:
        raise HTTPException(
            status_code=400,
            detail="A goal can only be linked to one task",
        )
    task_id = unique_ids[0]
    task = (
        db.query(Task)
        .filter(Task.user_id == user_id, Task.id == task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")
    if task.category != goal.category:
        raise HTTPException(
            status_code=400,
            detail=f"Task PT-{task.id} must match the goal category ({goal.category})",
        )
    db.execute(
        insert(goal_task_link).values(goal_id=goal.id, task_id=task.id)
    )


def sync_task_goals(db: Session, task: Task, goal_ids: list[int], user_id: int) -> None:
    """Set which goals point at this task (each goal may only reference one task)."""
    db.execute(delete(goal_task_link).where(goal_task_link.c.task_id == task.id))
    if not goal_ids:
        return
    unique_ids = list(dict.fromkeys(goal_ids))
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == user_id, Goal.id.in_(unique_ids))
        .all()
    )
    found = {g.id for g in goals}
    missing = [gid for gid in unique_ids if gid not in found]
    if missing:
        raise HTTPException(status_code=404, detail=f"Goal(s) not found: {missing}")
    for goal in goals:
        if goal.status != "active":
            raise HTTPException(
                status_code=400,
                detail="Can only link tasks to active goals",
            )
        if goal.category != task.category:
            raise HTTPException(
                status_code=400,
                detail=f'Goal "{goal.title}" must match the task category ({task.category})',
            )
        db.execute(delete(goal_task_link).where(goal_task_link.c.goal_id == goal.id))
        db.execute(
            insert(goal_task_link).values(goal_id=goal.id, task_id=task.id)
        )
