"""Shared category helpers — built-in IDs plus per-user custom categories."""

from __future__ import annotations

import re

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import CustomCategory

# Default categories shown in pickers.
BUILTIN_CATEGORY_IDS = (
    "health",
    "work",
    "learning",
    "entertainment",
    "others",
    "sleep",
)

# Older built-ins — promoted to per-user custom categories when still in use.
LEGACY_CATEGORY_META = {
    "personal_technical_projects": {
        "label": "Personal Technical Projects",
        "color": "#FB923C",
    },
    "ai_content_generation": {"label": "AI Content Generation", "color": "#450C3F"},
}

LEGACY_CATEGORY_IDS = tuple(LEGACY_CATEGORY_META.keys())

RESERVED_CATEGORY_IDS = set(BUILTIN_CATEGORY_IDS)

CATEGORY_SLUG_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def slugify_label(label: str) -> str:
    raw = label.strip().lower()
    raw = re.sub(r"[^a-z0-9]+", "_", raw)
    raw = re.sub(r"_+", "_", raw).strip("_")
    if not raw:
        raw = "custom"
    if raw[0].isdigit():
        raw = f"c_{raw}"
    return raw[:64]


def unique_slug(db: Session, user_id: int, base: str) -> str:
    slug = base
    n = 2
    while True:
        if slug in RESERVED_CATEGORY_IDS:
            slug = f"{base}_{n}"
            n += 1
            continue
        exists = (
            db.query(CustomCategory.id)
            .filter(CustomCategory.user_id == user_id, CustomCategory.slug == slug)
            .first()
        )
        if not exists:
            return slug
        slug = f"{base}_{n}"
        n += 1


def allowed_category_ids(db: Session, user_id: int) -> set[str]:
    custom = {
        row[0]
        for row in db.query(CustomCategory.slug).filter(CustomCategory.user_id == user_id).all()
    }
    return set(BUILTIN_CATEGORY_IDS) | set(LEGACY_CATEGORY_IDS) | custom


def ensure_legacy_custom_categories(db: Session) -> int:
    """
    For each user, create custom category rows for legacy category slugs
    that appear on their tasks/goals/activities but are no longer built-in.
    Returns number of rows created.
    """
    from app.models import Activity, Goal, Task

    created = 0
    user_ids = {
        row[0]
        for row in (
            db.query(Task.user_id).distinct().all()
            + db.query(Goal.user_id).distinct().all()
            + db.query(Activity.user_id).distinct().all()
        )
    }
    for user_id in user_ids:
        used = set()
        for model in (Task, Goal, Activity):
            used.update(
                row[0]
                for row in db.query(model.category)
                .filter(model.user_id == user_id, model.category.in_(LEGACY_CATEGORY_IDS))
                .distinct()
                .all()
                if row[0]
            )
        if not used:
            continue
        existing = {
            row[0]
            for row in db.query(CustomCategory.slug)
            .filter(CustomCategory.user_id == user_id, CustomCategory.slug.in_(used))
            .all()
        }
        for slug in sorted(used - existing):
            meta = LEGACY_CATEGORY_META[slug]
            db.add(
                CustomCategory(
                    user_id=user_id,
                    slug=slug,
                    label=meta["label"],
                    color=meta["color"],
                )
            )
            created += 1
    if created:
        db.commit()
    return created


def assert_valid_category(db: Session, user_id: int, category: str | None) -> None:
    if category is None:
        return
    if not CATEGORY_SLUG_RE.match(category):
        raise HTTPException(status_code=400, detail="Invalid category id")
    if category not in allowed_category_ids(db, user_id):
        raise HTTPException(
            status_code=400,
            detail="Unknown category. Create it first, or pick a built-in category.",
        )


def assert_valid_color(color: str) -> str:
    if not COLOR_RE.match(color):
        raise HTTPException(status_code=400, detail="Color must be a hex value like #34D399")
    return color.upper()
