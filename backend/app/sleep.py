"""Sleep duration and Ideal / Normal / Bad quality rules."""

from __future__ import annotations

from datetime import time


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


def _in_overnight_window(m: int, start: int, end: int) -> bool:
    """True if m is in [start, 24h) ∪ [0, end] (e.g. 23:30–00:30)."""
    return m >= start or m <= end


def classify_sleep_quality(start: time, end: time) -> str:
    """
    Ideal: bedtime 23:00–23:30 and wake 06:00–06:30 next day.
    Normal: bedtime 23:30–00:30 and wake 06:30–07:30 next day.
    Bad: anything else.
    Ideal is checked first when windows overlap (e.g. exactly 23:30 / 06:30).
    """
    start_m = _minutes(start)
    end_m = _minutes(end)

    ideal_start = _in_inclusive(start_m, 23 * 60, 23 * 60 + 30)
    ideal_end = _in_inclusive(end_m, 6 * 60, 6 * 60 + 30)
    if ideal_start and ideal_end:
        return "ideal"

    normal_start = _in_overnight_window(start_m, 23 * 60 + 30, 30)
    normal_end = _in_inclusive(end_m, 6 * 60 + 30, 7 * 60 + 30)
    if normal_start and normal_end:
        return "normal"

    return "bad"
