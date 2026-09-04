"""Sleep duration and Ideal / Normal / Bad quality rules."""

from __future__ import annotations

from datetime import time

MIN_GOOD_SLEEP_MINUTES = 7 * 60


def _minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def sleep_duration_minutes(start: time, end: time) -> int:
    """Minutes asleep, spanning midnight when wake is not after bedtime same day."""
    start_m = _minutes(start)
    end_m = _minutes(end)
    if end_m <= start_m:
        return end_m + 24 * 60 - start_m
    return end_m - start_m


def _in_inclusive(m: int, lo: int, hi: int) -> bool:
    return lo <= m <= hi


def classify_sleep_quality(start: time, end: time) -> str:
    """
    Ideal: wake 06:00–06:30 and duration ≥ 7 hours.
    Normal: wake 06:30–07:30 and duration ≥ 7 hours.
    Bad: anything else.
    Ideal is checked first when windows overlap (e.g. exactly 06:30).
    """
    duration = sleep_duration_minutes(start, end)
    if duration < MIN_GOOD_SLEEP_MINUTES:
        return "bad"

    end_m = _minutes(end)

    if _in_inclusive(end_m, 6 * 60, 6 * 60 + 30):
        return "ideal"

    if _in_inclusive(end_m, 6 * 60 + 30, 7 * 60 + 30):
        return "normal"

    return "bad"
