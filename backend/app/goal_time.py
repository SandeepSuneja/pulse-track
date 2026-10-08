"""Sum activity minutes attributed to a goal."""

from __future__ import annotations

from datetime import date

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models import Activity, Goal, goal_task_link


def sum_goal_minutes(
    db: Session,
    user_id: int,
    goal: Goal,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> int:
    """Minutes logged toward this goal (explicit goal_id + legacy task rules)."""
    linked_task_ids = [t.id for t in (goal.tasks or [])]
    q = db.query(func.coalesce(func.sum(Activity.duration_minutes), 0)).filter(
        Activity.user_id == user_id,
    )
    if start_date is not None:
        q = q.filter(Activity.activity_date >= start_date)
    if end_date is not None:
        q = q.filter(Activity.activity_date <= end_date)

    if linked_task_ids:
        task_id = linked_task_ids[0]
        other_goals_on_task = (
            db.execute(
                select(func.count())
                .select_from(goal_task_link)
                .where(
                    goal_task_link.c.task_id == task_id,
                    goal_task_link.c.goal_id != goal.id,
                )
            ).scalar()
            or 0
        )
        if other_goals_on_task > 0:
            q = q.filter(Activity.goal_id == goal.id)
        else:
            q = q.filter(
                or_(
                    Activity.goal_id == goal.id,
                    and_(
                        Activity.goal_id.is_(None),
                        Activity.task_id == task_id,
                    ),
                )
            )
    else:
        q = q.filter(Activity.category == goal.category)

    return int(q.scalar() or 0)


def logged_minutes_for_goals(
    db: Session,
    user_id: int,
    goals: list[Goal],
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[int, int]:
    return {
        g.id: sum_goal_minutes(
            db, user_id, g, start_date=start_date, end_date=end_date
        )
        for g in goals
    }
