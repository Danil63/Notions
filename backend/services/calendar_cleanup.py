from datetime import date, timedelta

from backend.models import CalendarData
from backend.services.storage import load_calendar, delete_old_calendar_entries

MAX_AGE_DAYS = 7


def cleanup_calendar(user_id: str) -> CalendarData:
    cutoff = (date.today() - timedelta(days=MAX_AGE_DAYS)).isoformat()
    delete_old_calendar_entries(user_id, cutoff)

    raw = load_calendar(user_id)
    entries = raw.get("entries", [])
    entries = [{**e, "done": e.get("done", False), "duration": e.get("duration", 1)} for e in entries]

    return CalendarData(entries=entries)
