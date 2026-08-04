from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
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

    activities: Mapped[list[Activity]] = relationship(back_populates="user", cascade="all, delete-orphan")
    goals: Mapped[list[Goal]] = relationship(back_populates="user", cascade="all, delete-orphan")
    effort_logs: Mapped[list[EffortLog]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Activity(Base):
    """A single logged activity block (what you did and for how long)."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(80), index=True)
    # health | learning | work | sleep | entertainment | others
    status: Mapped[str] = mapped_column(String(20), default="todo", index=True)
    # todo | in_progress | completed
    notes: Mapped[str] = mapped_column(Text, default="")
    activity_date: Mapped[date] = mapped_column(Date, index=True)
    # null = indefinite (no due date)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    # Optional per-activity effort scores (1–10)
    focus_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    energy_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    productivity_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="activities")


class Goal(Base):
    """Planned time targets so users can compare plan vs actual."""

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(80), index=True)
    target_minutes: Mapped[int] = mapped_column(Integer)
    period: Mapped[str] = mapped_column(String(20), default="weekly")  # daily | weekly | monthly
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[int] = mapped_column(Integer, default=1)  # 1/0 for SQLite simplicity
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="goals")


class EffortLog(Base):
    """Daily self-assessment across improvement parameters (independent of activities)."""

    __tablename__ = "effort_logs"
    __table_args__ = (UniqueConstraint("user_id", "log_date", name="uq_user_effort_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    log_date: Mapped[date] = mapped_column(Date, index=True)
    focus: Mapped[float] = mapped_column(Float, default=5.0)
    consistency: Mapped[float] = mapped_column(Float, default=5.0)
    productivity: Mapped[float] = mapped_column(Float, default=5.0)
    energy: Mapped[float] = mapped_column(Float, default=5.0)
    wellbeing: Mapped[float] = mapped_column(Float, default=5.0)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="effort_logs")
