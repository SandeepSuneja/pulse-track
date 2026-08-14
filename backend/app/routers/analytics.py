from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Activity, Goal, Task, User
from app.routers.goals import _expire_overdue_goals
from app.schemas import AnalyticsSummary, CategoryBreakdown, TaskBreakdown, TimeSeriesPoint

router = APIRouter(prefix="/analytics", tags=["analytics"])

Period = Literal["day", "week", "month", "year", "custom"]


def _resolve_range(period: Period, start: date | None, end: date | None) -> tuple[date, date]:
    today = date.today()
    if period == "day":
        return today, today
    if period == "week":
        start_d = today - timedelta(days=today.weekday())
        return start_d, today
    if period == "month":
        return today.replace(day=1), today
    if period == "year":
        return today.replace(month=1, day=1), today
    end_d = end or today
    start_d = start or (end_d - timedelta(days=29))
    return start_d, end_d


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    period: Period = Query(default="week"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalyticsSummary:
    start_d, end_d = _resolve_range(period, start_date, end_date)
    _expire_overdue_goals(db, current_user.id)

    activities = (
        db.query(Activity)
        .filter(
            Activity.user_id == current_user.id,
            Activity.activity_date >= start_d,
            Activity.activity_date <= end_d,
        )
        .all()
    )

    total_minutes = sum(a.duration_minutes for a in activities)
    by_category: dict[str, int] = defaultdict(int)
    by_task: dict[int | None, int] = defaultdict(int)
    by_day: dict[date, int] = defaultdict(int)
    for a in activities:
        by_category[a.category] += a.duration_minutes
        by_task[a.task_id] += a.duration_minutes
        by_day[a.activity_date] += a.duration_minutes

    category_breakdown = [
        CategoryBreakdown(
            category=cat,
            minutes=mins,
            percentage=round((mins / total_minutes) * 100, 1) if total_minutes else 0.0,
        )
        for cat, mins in sorted(by_category.items(), key=lambda x: x[1], reverse=True)
    ]

    task_ids = [tid for tid in by_task.keys() if tid is not None]
    task_meta = {
        t.id: t
        for t in db.query(Task).filter(Task.user_id == current_user.id, Task.id.in_(task_ids)).all()
    } if task_ids else {}

    task_breakdown: list[TaskBreakdown] = []
    for task_id, mins in sorted(by_task.items(), key=lambda x: x[1], reverse=True):
        if task_id is None:
            title = "Unlinked logs"
            category = "others"
        else:
            task = task_meta.get(task_id)
            title = f"PT-{task_id} · {task.title}" if task else f"PT-{task_id}"
            category = task.category if task else "others"
        task_breakdown.append(
            TaskBreakdown(
                task_id=task_id,
                title=title,
                category=category,
                minutes=mins,
                percentage=round((mins / total_minutes) * 100, 1) if total_minutes else 0.0,
            )
        )

    minutes_over_time = [
        TimeSeriesPoint(date=d, value=float(by_day.get(d, 0)))
        for d in _daterange(start_d, end_d)
    ]

    goals = (
        db.query(Goal)
        .filter(Goal.user_id == current_user.id, Goal.status == "active")
        .all()
    )
    goal_progress = []
    for goal in goals:
        linked_task_ids = [
            row[0]
            for row in db.query(Task.id)
            .filter(Task.user_id == current_user.id, Task.goal_id == goal.id)
            .all()
        ]
        q = db.query(func.coalesce(func.sum(Activity.duration_minutes), 0)).filter(
            Activity.user_id == current_user.id,
            Activity.activity_date >= start_d,
            Activity.activity_date <= end_d,
        )
        if linked_task_ids:
            q = q.filter(Activity.task_id.in_(linked_task_ids))
        else:
            q = q.filter(Activity.category == goal.category)
        actual = q.scalar()
        target = goal.target_minutes or 0
        days = max((end_d - start_d).days + 1, 1)
        if not target or goal.period == "deadline":
            scaled_target = 0
        elif goal.period == "daily":
            scaled_target = target * days
        elif goal.period == "weekly":
            scaled_target = target * (days / 7)
        else:
            scaled_target = target * (days / 30)
        goal_progress.append(
            {
                "goal_id": goal.id,
                "title": goal.title,
                "category": goal.category,
                "period": goal.period,
                "target_minutes": round(scaled_target),
                "actual_minutes": int(actual or 0),
                "completion_pct": round(min((int(actual or 0) / scaled_target) * 100, 999), 1)
                if scaled_target
                else 0.0,
            }
        )

    return AnalyticsSummary(
        period=period,
        start_date=start_d,
        end_date=end_d,
        total_minutes=total_minutes,
        activity_count=len(activities),
        category_breakdown=category_breakdown,
        task_breakdown=task_breakdown,
        minutes_over_time=minutes_over_time,
        goal_progress=goal_progress,
    )


def _daterange(start: date, end: date):
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)
