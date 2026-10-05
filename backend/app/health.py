"""Health category task types and activity distance rules."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException

HEALTH_ACTIVITY_TYPES = frozenset({"weight_lifting", "cardio"})
HEALTH_CARDIO_TYPES = frozenset({"walking_running", "cycling", "swimming"})


def normalize_health_task_fields(
    category: str,
    health_activity_type: Optional[str],
    health_cardio_type: Optional[str],
) -> tuple[Optional[str], Optional[str]]:
    if category != "health":
        if health_activity_type or health_cardio_type:
            raise HTTPException(
                status_code=400,
                detail="Health activity options apply only to Health category tasks.",
            )
        return None, None

    if not health_activity_type or health_activity_type not in HEALTH_ACTIVITY_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Health tasks require activity type: weight_lifting or cardio.",
        )

    if health_activity_type == "weight_lifting":
        if health_cardio_type:
            raise HTTPException(
                status_code=400,
                detail="Cardio type is not used for weight lifting tasks.",
            )
        return "weight_lifting", None

    if not health_cardio_type or health_cardio_type not in HEALTH_CARDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Cardio tasks require type: walking_running, cycling, or swimming.",
        )
    return "cardio", health_cardio_type


def apply_health_distance(
    *,
    task_category: str,
    health_activity_type: Optional[str],
    health_cardio_type: Optional[str],
    distance_km: Optional[float],
) -> Optional[float]:
    if task_category != "health":
        if distance_km is not None:
            raise HTTPException(
                status_code=400,
                detail="Distance applies only to health activity logs.",
            )
        return None

    if health_activity_type == "cardio" and health_cardio_type == "walking_running":
        if distance_km is None:
            return None
        if distance_km <= 0 or distance_km > 500:
            raise HTTPException(
                status_code=400,
                detail="Distance must be between 0 and 500 km.",
            )
        return round(float(distance_km), 3)

    if distance_km is not None:
        raise HTTPException(
            status_code=400,
            detail="Distance is only tracked for walking or running cardio tasks.",
        )
    return None
