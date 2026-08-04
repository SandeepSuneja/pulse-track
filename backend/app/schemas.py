from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    display_name: str = ""
    bio: str = ""
    timezone: str = "UTC"


class UserCreate(UserBase):
    email: EmailStr


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    timezone: Optional[str] = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    firebase_uid: str
    email: EmailStr
    created_at: datetime


ACTIVITY_STATUSES = ("todo", "in_progress", "completed")
ACTIVITY_CATEGORIES = ("health", "learning", "work", "sleep", "entertainment", "others")


class ActivityBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(pattern="^(health|learning|work|sleep|entertainment|others)$")
    status: str = Field(default="todo", pattern="^(todo|in_progress|completed)$")
    notes: str = ""
    activity_date: date
    # null / omitted = indefinite task (no due date)
    due_date: Optional[date] = None
    duration_minutes: int = Field(ge=1, le=24 * 60)
    focus_score: Optional[int] = Field(default=None, ge=1, le=10)
    energy_score: Optional[int] = Field(default=None, ge=1, le=10)
    productivity_score: Optional[int] = Field(default=None, ge=1, le=10)


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(
        default=None, pattern="^(health|learning|work|sleep|entertainment|others)$"
    )
    status: Optional[str] = Field(default=None, pattern="^(todo|in_progress|completed)$")
    notes: Optional[str] = None
    activity_date: Optional[date] = None
    due_date: Optional[date] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=24 * 60)
    focus_score: Optional[int] = Field(default=None, ge=1, le=10)
    energy_score: Optional[int] = Field(default=None, ge=1, le=10)
    productivity_score: Optional[int] = Field(default=None, ge=1, le=10)


class ActivityOut(ActivityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime


class GoalBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(pattern="^(health|learning|work|sleep|entertainment|others)$")
    target_minutes: int = Field(ge=1)
    period: str = Field(pattern="^(daily|weekly|monthly)$")
    start_date: date
    end_date: Optional[date] = None
    is_active: bool = True


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(
        default=None, pattern="^(health|learning|work|sleep|entertainment|others)$"
    )
    target_minutes: Optional[int] = Field(default=None, ge=1)
    period: Optional[str] = Field(default=None, pattern="^(daily|weekly|monthly)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    category: str
    target_minutes: int
    period: str
    start_date: date
    end_date: Optional[date]
    is_active: bool
    created_at: datetime


class EffortLogBase(BaseModel):
    log_date: date
    focus: float = Field(ge=0, le=10)
    consistency: float = Field(ge=0, le=10)
    productivity: float = Field(ge=0, le=10)
    energy: float = Field(ge=0, le=10)
    wellbeing: float = Field(ge=0, le=10)
    notes: str = ""


class EffortLogCreate(EffortLogBase):
    pass


class EffortLogOut(EffortLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime


class TimeSeriesPoint(BaseModel):
    date: date
    value: float


class CategoryBreakdown(BaseModel):
    category: str
    minutes: int
    percentage: float


class ParameterAverage(BaseModel):
    parameter: str
    average: float


class AnalyticsSummary(BaseModel):
    period: str
    start_date: date
    end_date: date
    total_minutes: int
    activity_count: int
    category_breakdown: list[CategoryBreakdown]
    minutes_over_time: list[TimeSeriesPoint]
    effort_over_time: dict[str, list[TimeSeriesPoint]]
    effort_averages: list[ParameterAverage]
    goal_progress: list[dict]
