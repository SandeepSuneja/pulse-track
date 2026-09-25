from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.categories import (
    BUILTIN_CATEGORY_IDS,
    CATEGORY_SLUG_RE,
    RESERVED_CATEGORY_IDS,
    assert_valid_color,
    slugify_label,
    unique_slug,
)
from app.database import get_db
from app.models import Activity, CustomCategory, Goal, Task, User
from app.schemas import (
    CategoryOptionOut,
    CustomCategoryCreate,
    CustomCategoryOut,
    CustomCategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["categories"])

# Match frontend constants.js built-in colors (fg).
BUILTIN_COLORS = {
    "health": "#34D399",
    "work": "#60A5FA",
    "learning": "#C084FC",
    "entertainment": "#838921",
    "others": "#E2E8F0",
    "sleep": "#FB7185",
}

BUILTIN_LABELS = {
    "health": "Health",
    "work": "Work",
    "learning": "Learning",
    "entertainment": "Entertainment",
    "others": "Others",
    "sleep": "Sleep",
}


def _out(row: CustomCategory) -> CustomCategoryOut:
    return CustomCategoryOut(
        id=row.id,
        slug=row.slug,
        label=row.label,
        color=row.color,
        created_at=row.created_at,
    )


@router.get("", response_model=list[CategoryOptionOut])
def list_category_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CategoryOptionOut]:
    options = [
        CategoryOptionOut(
            id=cid,
            label=BUILTIN_LABELS[cid],
            color=BUILTIN_COLORS[cid],
            builtin=True,
        )
        for cid in BUILTIN_CATEGORY_IDS
    ]
    custom = (
        db.query(CustomCategory)
        .filter(CustomCategory.user_id == current_user.id)
        .order_by(CustomCategory.label.asc())
        .all()
    )
    options.extend(
        CategoryOptionOut(id=row.slug, label=row.label, color=row.color, builtin=False)
        for row in custom
    )
    return options


@router.get("/custom", response_model=list[CustomCategoryOut])
def list_custom_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CustomCategoryOut]:
    rows = (
        db.query(CustomCategory)
        .filter(CustomCategory.user_id == current_user.id)
        .order_by(CustomCategory.label.asc())
        .all()
    )
    return [_out(row) for row in rows]


@router.post("/custom", response_model=CustomCategoryOut, status_code=status.HTTP_201_CREATED)
def create_custom_category(
    payload: CustomCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomCategoryOut:
    label = payload.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Label is required")
    color = assert_valid_color(payload.color)

    if payload.slug:
        if not CATEGORY_SLUG_RE.match(payload.slug):
            raise HTTPException(status_code=400, detail="Invalid category id")
        if payload.slug in RESERVED_CATEGORY_IDS:
            raise HTTPException(status_code=400, detail="That id is reserved for a built-in category")
        clash = (
            db.query(CustomCategory)
            .filter(CustomCategory.user_id == current_user.id, CustomCategory.slug == payload.slug)
            .first()
        )
        if clash:
            raise HTTPException(status_code=400, detail="You already have a category with that id")
        slug = payload.slug
    else:
        slug = unique_slug(db, current_user.id, slugify_label(label))

    row = CustomCategory(
        user_id=current_user.id,
        slug=slug,
        label=label,
        color=color,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.patch("/custom/{category_id}", response_model=CustomCategoryOut)
def update_custom_category(
    category_id: int,
    payload: CustomCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomCategoryOut:
    row = (
        db.query(CustomCategory)
        .filter(CustomCategory.id == category_id, CustomCategory.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    data = payload.model_dump(exclude_unset=True)
    if "label" in data:
        label = (data["label"] or "").strip()
        if not label:
            raise HTTPException(status_code=400, detail="Label is required")
        row.label = label
    if "color" in data and data["color"] is not None:
        row.color = assert_valid_color(data["color"])
    db.add(row)
    db.commit()
    db.refresh(row)
    return _out(row)


@router.delete("/custom/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    row = (
        db.query(CustomCategory)
        .filter(CustomCategory.id == category_id, CustomCategory.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")

    slug = row.slug
    in_use = (
        db.query(Task.id).filter(Task.user_id == current_user.id, Task.category == slug).first()
        or db.query(Goal.id).filter(Goal.user_id == current_user.id, Goal.category == slug).first()
        or db.query(Activity.id)
        .filter(Activity.user_id == current_user.id, Activity.category == slug)
        .first()
    )
    if in_use:
        raise HTTPException(
            status_code=400,
            detail="Category is in use by tasks, goals, or activities. Reassign them first.",
        )

    db.delete(row)
    db.commit()
