from __future__ import annotations

from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


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


TASK_STATUSES = ("todo", "in_progress", "completed")
TASK_CATEGORIES = (
    "health",
    "learning",
    "work",
    "sleep",
    "entertainment",
    "personal_technical_projects",
    "ai_content_generation",
    "others",
)
CATEGORY_PATTERN = (
    "^(health|learning|work|sleep|entertainment|"
    "personal_technical_projects|ai_content_generation|others)$"
)
STATUS_PATTERN = "^(todo|in_progress|completed)$"


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(pattern=CATEGORY_PATTERN)
    status: str = Field(default="todo", pattern=STATUS_PATTERN)
    notes: str = ""
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimate_minutes: int = Field(default=60, ge=1, le=24 * 60)
    goal_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, pattern=CATEGORY_PATTERN)
    status: Optional[str] = Field(default=None, pattern=STATUS_PATTERN)
    notes: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimate_minutes: Optional[int] = Field(default=None, ge=1, le=24 * 60)
    goal_id: Optional[int] = None


class TaskOut(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    logged_minutes: int = 0
    activity_count: int = 0
    goal_title: Optional[str] = None


class ActivityBase(BaseModel):
    task_id: int
    notes: str = ""
    activity_date: date
    duration_minutes: int = Field(ge=1, le=24 * 60)
    # Sleep category only — client may send; server recomputes duration + quality
    sleep_start_time: Optional[time] = None
    sleep_end_time: Optional[time] = None


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    notes: Optional[str] = None
    activity_date: Optional[date] = None
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=24 * 60)
    sleep_start_time: Optional[time] = None
    sleep_end_time: Optional[time] = None


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    task_id: Optional[int]
    title: str
    category: str
    notes: str
    activity_date: date
    duration_minutes: int
    sleep_start_time: Optional[time] = None
    sleep_end_time: Optional[time] = None
    sleep_quality: Optional[str] = None
    created_at: datetime


class GoalTaskBrief(BaseModel):
    id: int
    title: str
    status: str
    category: str


class GoalBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(pattern=CATEGORY_PATTERN)
    # Hours-based goals use target_minutes + period (daily|weekly|monthly).
    # Deadline goals use end_date and period="deadline" with no target.
    target_minutes: int | None = Field(default=None, ge=1)
    period: str = Field(default="weekly", pattern="^(daily|weekly|monthly|deadline)$")
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool = True


class GoalCreate(GoalBase):
    task_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_hours_or_due_date(self) -> GoalCreate:
        has_hours = self.target_minutes is not None
        has_due = self.end_date is not None
        if has_hours and has_due:
            raise ValueError("Choose either target hours or a due date, not both")
        if not has_hours and not has_due:
            raise ValueError("Set target hours or a due date")
        if has_hours:
            if self.period == "deadline":
                raise ValueError("Hours-based goals need a daily, weekly, or monthly period")
            self.end_date = None
        else:
            self.period = "deadline"
            self.target_minutes = None
        return self


class GoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, pattern=CATEGORY_PATTERN)
    target_minutes: int | None = Field(default=None, ge=1)
    period: Optional[str] = Field(default=None, pattern="^(daily|weekly|monthly|deadline)$")
    start_date: date | None = None
    # end_date can only be set once (when previously null); never changed afterward
    end_date: date | None = None
    status: Optional[str] = Field(default=None, pattern="^(active|completed|failed)$")
    is_active: Optional[bool] = None
    task_ids: Optional[list[int]] = None


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    category: str
    target_minutes: int | None
    period: str
    start_date: date | None
    end_date: date | None
    status: str
    is_active: bool
    created_at: datetime
    task_ids: list[int] = Field(default_factory=list)
    tasks: list[GoalTaskBrief] = Field(default_factory=list)


class TimeSeriesPoint(BaseModel):
    date: date
    value: float


class CategoryTimeSeriesPoint(BaseModel):
    """One day of logged minutes, flattened for charts: date + category keys."""

    model_config = ConfigDict(extra="allow")

    date: date


class CategoryBreakdown(BaseModel):
    category: str
    minutes: int
    percentage: float


class TaskBreakdown(BaseModel):
    task_id: int | None = None
    title: str
    category: str
    minutes: int
    percentage: float


class SleepTimeSeriesPoint(BaseModel):
    """Day-wise sleep duration and Ideal/Normal/Bad quality for charts."""

    date: date
    minutes: int
    quality: str | None = None


class AnalyticsSummary(BaseModel):
    period: str
    start_date: date
    end_date: date
    total_minutes: int
    activity_count: int
    category_breakdown: list[CategoryBreakdown]
    task_breakdown: list[TaskBreakdown] = []
    minutes_over_time: list[TimeSeriesPoint]
    category_minutes_over_time: list[CategoryTimeSeriesPoint] = []
    sleep_over_time: list[SleepTimeSeriesPoint] = []
    goal_progress: list[dict]
