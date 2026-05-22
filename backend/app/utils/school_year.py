"""School year / semester helpers (see spec-04 §2.3, spec-05 §1.5.1).

Taiwan academic calendar: 8/1 – 7/31. 114 學年度 == school_year 2025.

  Aug 1 – Jan 31  →  first semester of `year` (or `year-1` when month <= 1)
  Feb 1 – Jul 31  →  second semester of `year - 1`
"""
from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Literal

Semester = Literal["first", "second"]


def get_current_school_year(today: date | None = None) -> int:
    """Return the school year (西元年) covering ``today``."""
    d = today or datetime.now(UTC).date()
    if d.month >= 8:
        return d.year
    if d.month <= 1:
        return d.year - 1
    return d.year - 1


def get_current_semester(today: date | None = None) -> Semester:
    """Return ``'first'`` for 8/1–1/31, ``'second'`` for 2/1–7/31."""
    d = today or datetime.now(UTC).date()
    if d.month >= 8 or d.month <= 1:
        return "first"
    return "second"
