"""Centralized 'now' helper.

If an admin has set a manual datetime override (SystemClock table, id=1),
the clock runs forward from that point:
  effective_now = manual_datetime + (real_now - set_at)

This means time keeps ticking from the manually set value.
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def get_now():
    """Return current datetime, respecting manual admin override."""
    from app.models import SystemClock

    try:
        clock = SystemClock.query.get(1)
        if clock and clock.manual_datetime and clock.updated_at:
            tz = ZoneInfo(clock.timezone_name or "Europe/Moscow")

            # The datetime that was manually set
            manual_dt = datetime.fromisoformat(clock.manual_datetime)
            if manual_dt.tzinfo is None:
                manual_dt = manual_dt.replace(tzinfo=tz)

            # When it was set (stored as UTC in updated_at)
            set_at = clock.updated_at
            if set_at.tzinfo is None:
                set_at = set_at.replace(tzinfo=timezone.utc)

            # How much real time has passed since it was set
            real_now = datetime.now(timezone.utc)
            elapsed = real_now - set_at

            # Effective time = manual start + elapsed
            return manual_dt + elapsed

    except Exception:
        pass

    return datetime.now(ZoneInfo("Europe/Moscow"))
