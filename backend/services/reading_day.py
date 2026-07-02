"""The canonical "reading day" — the user's local calendar day with a 4-hour rollover.

A session started at 01:30 local time belongs to the previous evening's reading
day, so a bedtime read never splits across two days. Everything that buckets
reading activity by day — streaks, the daily chart, the activity heatmap,
re-read detection, per-book timelines, momentum, active-day sets — MUST go
through these helpers so the buckets can never drift apart. The one deliberate
exception is hour-of-day display (the hour × weekday heatmap): it uses the
plain timezone offset, because a 01:00 session should render at 1 AM, not 9 PM.

``tz_offset`` follows JS ``getTimezoneOffset()``: minutes, negative east of UTC
(CEST → -120).
"""
from datetime import date, datetime, timedelta

from sqlalchemy import func

ROLLOVER_HOURS = 4


def effective_hours(tz_offset_minutes: int, rollover_hours: int = ROLLOVER_HOURS) -> int:
    """Hours to add to a UTC timestamp so its date() is the reading day."""
    tz_hours = -(tz_offset_minutes // 60)
    return tz_hours - rollover_hours


def date_modifier(tz_offset_minutes: int, rollover_hours: int = ROLLOVER_HOURS) -> str:
    """SQLite modifier for DateTime columns: ``func.date(col, date_modifier(tz))``."""
    return f"{effective_hours(tz_offset_minutes, rollover_hours):+d} hours"


def epoch_day(column, tz_offset_minutes: int):
    """SQLAlchemy expression: epoch-seconds column (e.g. ``PageStat.start_time``)
    → its reading day as a 'YYYY-MM-DD' string."""
    return func.date(column, "unixepoch", date_modifier(tz_offset_minutes))


def epoch_day_int(epoch_seconds: int, tz_offset_minutes: int) -> int:
    """Python-side reading-day ordinal for an epoch timestamp — for set-based
    day grouping where only day *identity* matters, not the date string."""
    return (epoch_seconds + effective_hours(tz_offset_minutes) * 3600) // 86400


def effective_today(tz_offset_minutes: int, rollover_hours: int = ROLLOVER_HOURS) -> date:
    """The user's current reading day — what walking back a streak starts from."""
    return (datetime.utcnow() + timedelta(hours=effective_hours(tz_offset_minutes, rollover_hours))).date()
