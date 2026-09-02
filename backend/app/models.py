from __future__ import annotations

from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """App profile linked to a Firebase Auth UID."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    display_name: Mapped[str] = mapped_column(String(120), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tasks: Mapped[list[Task]] = relationship(back_populates="user", cascade="all, delete-orphan")
    activities: Mapped[list[Activity]] = relationship(back_populates="user", cascade="all, delete-orphan")
    goals: Mapped[list[Goal]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Task(Base):
    """Board ticket / planned work item."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    goal_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("goals.id", ondelete="SET NULL"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(80), index=True)
    # health | learning | work | sleep | entertainment |
    # personal_technical_projects | ai_content_generation | others
    status: Mapped[str] = mapped_column(String(20), default="todo", index=True)
    # todo | in_progress | completed
    notes: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    # Planned date the task comes into progress (In Progress)
    # null = indefinite (no due date)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    estimate_minutes: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="tasks")
    goal: Mapped[Optional[Goal]] = relationship(back_populates="tasks")
    activities: Mapped[list[Activity]] = relationship(
        back_populates="task", cascade="all, delete-orphan"
    )


class Activity(Base):
    """Time log entry against a board task."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    task_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True, nullable=True
    )
    # Denormalized for analytics / list display (copied from task on create)
    title: Mapped[str] = mapped_column(String(200), default="")
    category: Mapped[str] = mapped_column(String(80), index=True, default="others")
    notes: Mapped[str] = mapped_column(Text, default="")
    activity_date: Mapped[date] = mapped_column(Date, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    # Sleep logs only — overnight start/wake clock times and Ideal/Normal/Bad rating
    sleep_start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    sleep_end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    sleep_quality: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="activities")
    task: Mapped[Optional[Task]] = relationship(back_populates="activities")


class Goal(Base):
    """Planned time targets so users can compare plan vs actual."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(80), index=True)
    # Null for deadline-only goals (period="deadline")
    target_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    period: Mapped[str] = mapped_column(String(20), default="weekly")  # daily | weekly | monthly | deadline
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    # active | completed | failed
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    is_active: Mapped[int] = mapped_column(Integer, default=1)  # 1 when status=active
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="goals")
    tasks: Mapped[list[Task]] = relationship(back_populates="goal")
