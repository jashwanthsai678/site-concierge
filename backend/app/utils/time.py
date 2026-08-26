from datetime import datetime, timedelta, timezone


def utc_day_bounds(now: datetime | None = None) -> tuple[datetime, datetime]:
    """Returns (start, end) of "today" in UTC — used for the dashboard's
    "Today's ..." stat tiles. UTC (not local time) to avoid timezone
    ambiguity in a single-server MVP.
    """
    now = now or datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)
