from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Activity, EffortLog, Goal, User
from app.schemas import (
    AnalyticsSummary,
    CategoryBreakdown,
    ParameterAverage,
    TimeSeriesPoint,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

Period = Literal["day", "week", "month", "year", "custom"]
EFFORT_PARAMS = ("focus", "consistency", "productivity", "energy", "wellbeing")


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
    # custom
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
    by_day: dict[date, int] = defaultdict(int)
    for a in activities:
        by_category[a.category] += a.duration_minutes
        by_day[a.activity_date] += a.duration_minutes

    category_breakdown = [
        CategoryBreakdown(
            category=cat,
            minutes=mins,
            percentage=round((mins / total_minutes) * 100, 1) if total_minutes else 0.0,
        )
        for cat, mins in sorted(by_category.items(), key=lambda x: x[1], reverse=True)
    ]

    minutes_over_time = [
        TimeSeriesPoint(date=d, value=float(by_day.get(d, 0)))
        for d in _daterange(start_d, end_d)
    ]

    effort_rows = (
        db.query(EffortLog)
        .filter(
            EffortLog.user_id == current_user.id,
            EffortLog.log_date >= start_d,
            EffortLog.log_date <= end_d,
        )
        .order_by(EffortLog.log_date.asc())
        .all()
    )
    effort_map = {row.log_date: row for row in effort_rows}
    effort_over_time: dict[str, list[TimeSeriesPoint]] = {}
    for param in EFFORT_PARAMS:
        series: list[TimeSeriesPoint] = []
        for d in _daterange(start_d, end_d):
            row = effort_map.get(d)
            value = float(getattr(row, param)) if row else 0.0
            series.append(TimeSeriesPoint(date=d, value=value))
        effort_over_time[param] = series

    effort_averages: list[ParameterAverage] = []
    if effort_rows:
        for param in EFFORT_PARAMS:
            avg = sum(getattr(r, param) for r in effort_rows) / len(effort_rows)
            effort_averages.append(ParameterAverage(parameter=param, average=round(avg, 2)))
    else:
        effort_averages = [ParameterAverage(parameter=p, average=0.0) for p in EFFORT_PARAMS]

    goals = (
        db.query(Goal)
        .filter(Goal.user_id == current_user.id, Goal.is_active == 1)
        .all()
    )
    goal_progress = []
    for goal in goals:
        actual = (
            db.query(func.coalesce(func.sum(Activity.duration_minutes), 0))
            .filter(
                Activity.user_id == current_user.id,
                Activity.category == goal.category,
                Activity.activity_date >= start_d,
                Activity.activity_date <= end_d,
            )
            .scalar()
        )
        target = goal.target_minutes
        # Scale weekly/monthly targets roughly to the selected window length
        days = max((end_d - start_d).days + 1, 1)
        if goal.period == "daily":
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
        minutes_over_time=minutes_over_time,
        effort_over_time=effort_over_time,
        effort_averages=effort_averages,
        goal_progress=goal_progress,
    )


def _daterange(start: date, end: date):
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)
